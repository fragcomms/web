import type { RenderFrame, ReplayTickSource, WorldBounds, PositionedEvent } from "../../types";
import type { FluidSimPipelineSet, FluidCheckpoint } from "./fluidTypes";
import { FluidGPU } from "./fluidGpu";

export class FluidSim {
  private gpu: FluidGPU;
  private bounds: WorldBounds = { minX: -4000, minY: -4000, maxX: 4000, maxY: 4000 };
  private replaySource: ReplayTickSource | null = null;
  
  private startTick = 0;
  private endTick = 0;
  private ticksPerSecond = 64;
  private simStepTicks = 3;
  private snapshotIntervalSteps = 16; // Checkpoint every 0.5s
  private currentStepIndex = -1;
  private resetTicks: number[] = [0];

  // Double-buffering player state
  private previousPlayers = new Map<string, { x: number; y: number; }>();
  private nextPlayersScratch = new Map<string, { x: number; y: number; }>();

  // AOT Checkpoint Memory & Raw Events
  private checkpoints = new Map<number, FluidCheckpoint>();
  private checkpointSteps: number[] = [];
  private checkpointPool: FluidCheckpoint[] = [];
  private roundSmokes: PositionedEvent[] = []; // Stores raw events for the Smart Horizon

  private currentRoundStartTick = -1;

  constructor(device: GPUDevice, queue: GPUQueue, pipelines: FluidSimPipelineSet, sampleLayout: GPUBindGroupLayout) {
    this.gpu = new FluidGPU(device, queue, pipelines, sampleLayout);
  }

  setBounds(bounds: WorldBounds) {
    this.bounds = bounds;
    this.gpu.writeSampleParams(bounds);
    this.resetSimulation();
  }

  getSampleBindGroup() {
    return this.gpu.sampleBindGroup;
  }

  prepareRoundMemory(startTick: number, endTick: number, smokeEvents: PositionedEvent[], ticksPerSecond: number) {
    this.roundSmokes = smokeEvents || [];

    if (this.roundSmokes.length === 0) {
      this.clearCheckpoints();
      for (const cp of this.checkpointPool) {
        cp.velocityTexture.destroy();
        cp.densityTexture.destroy();
      }
      this.checkpointPool = [];
      return;
    }

    this.ticksPerSecond = ticksPerSecond;
    this.simStepTicks = Math.max(1, Math.round(ticksPerSecond / 32));
    this.snapshotIntervalSteps = Math.max(1, Math.round((ticksPerSecond * 0.5) / this.simStepTicks));
    
    const paddedEndTick = endTick + (7 * ticksPerSecond); 
    const totalSteps = Math.ceil((paddedEndTick - startTick) / this.simStepTicks);
    const requiredCheckpoints = Math.ceil(totalSteps / this.snapshotIntervalSteps) + 1;

    const currentPoolSize = this.checkpointPool.length;

    if (requiredCheckpoints > currentPoolSize) {
      const needed = requiredCheckpoints - currentPoolSize;
      for (let i = 0; i < needed; i++) {
        this.checkpointPool.push({
          stepIndex: -1, 
          velocityTexture: this.gpu.createCheckpointTexture(),
          densityTexture: this.gpu.createCheckpointTexture(),
          previousPlayers: new Map()
        });
      }
    } else if (requiredCheckpoints < currentPoolSize) {
      const excess = this.checkpointPool.splice(requiredCheckpoints);
      for (const cp of excess) {
        cp.velocityTexture.destroy();
        cp.densityTexture.destroy();
      }
    }

    this.clearCheckpoints();
    for (const cp of this.checkpointPool) cp.stepIndex = -1;
  }

  syncToFrame(frame: RenderFrame) {
    const isScrubbing = (frame as any).isScrubbing ?? false;
    const source = frame.replaySource ?? this.replaySource;
    
    if (source && (source !== this.replaySource || source.getStartTick() !== this.startTick || source.getEndTick() !== this.endTick || source.ticksPerSecond !== this.ticksPerSecond)) {
      this.setReplaySource(source);
    }

    if (source) {
      const activeRound = (source as any).getActiveRoundChunk?.();
      if (activeRound && this.currentRoundStartTick !== activeRound.startTick) {
        this.prepareRoundMemory(
          activeRound.startTick, 
          activeRound.endTick, 
          activeRound.events.smokegrenade_detonate, 
          source.ticksPerSecond
        );
        this.currentRoundStartTick = activeRound.startTick;
      }
    }

    if (!this.replaySource) {
      this.resetSimulation();
      this.runSimulationStep(frame, false);
      this.currentStepIndex = 0;
      return;
    }

    const targetTick = Math.max(this.startTick, Math.min(Math.floor(frame.tick), this.endTick));
    const targetStepIndex = Math.floor((targetTick - this.startTick) / this.simStepTicks);
    if (targetStepIndex < 0) return this.resetSimulation();

    let resetTick = this.startTick;
    for (const tick of this.resetTicks) {
      if (tick > targetTick) break;
      resetTick = tick;
    }
    const resetStepIndex = Math.ceil((resetTick - this.startTick) / this.simStepTicks);

    // Fast-path for active UI scrubbing
    if (isScrubbing) {
      this.restoreNearestCheckpoint(targetStepIndex, resetStepIndex);
      return;
    }

    let bestCheckpoint = -1;
    for (const step of this.checkpointSteps) {
      if (step > targetStepIndex) break;
      if (step < resetStepIndex) continue;
      bestCheckpoint = step;
    }

    if (this.currentStepIndex > targetStepIndex || this.currentStepIndex < resetStepIndex - 1 || bestCheckpoint > this.currentStepIndex) {
      this.restoreNearestCheckpoint(targetStepIndex, resetStepIndex);
    }

    const maxCatchupSec = 25;
    const maxCatchupSteps = Math.ceil((maxCatchupSec * this.ticksPerSecond) / this.simStepTicks);
    const impactWindowStart = targetTick - (maxCatchupSec * this.ticksPerSecond);

    let hasRelevantSmoke = false;
    for (let i = 0; i < this.roundSmokes.length; i++) {
      const smoke = this.roundSmokes[i];
      if (smoke.t <= targetTick && smoke.t >= impactWindowStart) {
        hasRelevantSmoke = true;
        break;
      }
    }

    const requiredSteps = hasRelevantSmoke ? maxCatchupSteps : 0;
    const idealCatchupStart = Math.max(resetStepIndex, targetStepIndex - requiredSteps);

    if (this.currentStepIndex < idealCatchupStart - 1) {
      this.gpu.clearStateTextures();
      this.previousPlayers.clear();
      this.currentStepIndex = idealCatchupStart - 1;
    }

    while (this.currentStepIndex < targetStepIndex) {
      const nextStepIndex = this.currentStepIndex + 1;
      const stepTick = this.startTick + nextStepIndex * this.simStepTicks;
      const stepFrame = this.replaySource.getFrameAtTick(stepTick);
      
      if (stepFrame) {
        const isCatchingUp = nextStepIndex < targetStepIndex;
        this.runSimulationStep(stepFrame, isCatchingUp);
      }
      
      this.currentStepIndex = nextStepIndex;
      
      if (this.currentStepIndex >= 0 && this.currentStepIndex % this.snapshotIntervalSteps === 0) {
        this.captureCheckpoint(this.currentStepIndex);
      }
    }
  }

  private setReplaySource(source: ReplayTickSource) {
    this.replaySource = source;
    this.startTick = source.getStartTick();
    this.endTick = source.getEndTick();
    this.ticksPerSecond = source.ticksPerSecond;
    this.simStepTicks = Math.max(1, Math.round(this.ticksPerSecond / 32));
    this.snapshotIntervalSteps = Math.max(1, Math.round((this.ticksPerSecond * 0.5) / this.simStepTicks));
    
    const sourceTicks = source.getSimulationResetTicks?.() ?? [source.getStartTick()];
    const clamped = sourceTicks.filter(t => Number.isFinite(t)).map(t => Math.max(this.startTick, Math.min(t, this.endTick)));
    this.resetTicks = Array.from(new Set(clamped)).sort((a, b) => a - b);
    if (!this.resetTicks.includes(this.startTick)) this.resetTicks.unshift(this.startTick);

    this.resetSimulation();
  }

  private resetSimulation() {
    this.currentStepIndex = -1;
    this.previousPlayers.clear();
    this.clearCheckpoints();
    this.gpu.clearStateTextures();
  }

  private clearCheckpoints() {
    this.checkpoints.clear();
    this.checkpointSteps = [];
  }

  private restoreNearestCheckpoint(targetStepIndex: number, minStepIndex = 0) {
    let checkpointStep = -1;
    for (const step of this.checkpointSteps) {
      if (step > targetStepIndex) break;
      if (step < minStepIndex) continue;
      checkpointStep = step;
    }

    const targetCurrentStep = checkpointStep < 0 ? minStepIndex - 1 : checkpointStep;
    if (this.currentStepIndex === targetCurrentStep) return;

    const checkpoint = this.checkpoints.get(checkpointStep);
    if (!checkpoint || checkpointStep < 0) {
      this.previousPlayers.clear();
      this.currentStepIndex = minStepIndex - 1;
      this.gpu.clearStateTextures();
      return;
    }

    this.gpu.loadCheckpoint(checkpoint);
    
    for (const [k, v] of checkpoint.previousPlayers.entries()) {
      let p = this.previousPlayers.get(k);
      if (!p) {
        p = { x: 0, y: 0 };
        this.previousPlayers.set(k, p);
      }
      p.x = v.x;
      p.y = v.y;
    }
    for (const k of this.previousPlayers.keys()) {
      if (!checkpoint.previousPlayers.has(k)) this.previousPlayers.delete(k);
    }
    
    this.currentStepIndex = checkpointStep;
  }

  private captureCheckpoint(stepIndex: number) {
    if (this.checkpoints.has(stepIndex)) return; 

    const poolIndex = this.checkpointSteps.length;
    if (poolIndex >= this.checkpointPool.length) return;

    const checkpoint = this.checkpointPool[poolIndex];
    checkpoint.stepIndex = stepIndex;

    this.gpu.saveCheckpoint(checkpoint);

    for (const [k, v] of this.previousPlayers.entries()) {
      let p = checkpoint.previousPlayers.get(k);
      if (!p) {
        p = { x: 0, y: 0 };
        checkpoint.previousPlayers.set(k, p);
      }
      p.x = v.x;
      p.y = v.y;
    }
    for (const k of checkpoint.previousPlayers.keys()) {
      if (!this.previousPlayers.has(k)) checkpoint.previousPlayers.delete(k);
    }

    this.checkpoints.set(stepIndex, checkpoint);
    this.checkpointSteps.push(stepIndex);
  }

  private runSimulationStep(frame: RenderFrame, isCatchingUp: boolean = false) {
    const dtSec = this.simStepTicks / this.ticksPerSecond;

    this.gpu.stepPhysics(
      frame, 
      dtSec, 
      this.bounds, 
      this.previousPlayers, 
      this.nextPlayersScratch, 
      isCatchingUp
    );

    const temp = this.previousPlayers;
    this.previousPlayers = this.nextPlayersScratch;
    this.nextPlayersScratch = temp;
  }
}