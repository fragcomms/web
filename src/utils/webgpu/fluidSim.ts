import type {
  RenderFrame,
  ReplayTickSource,
  WorldBounds,
} from "./types";

type FluidSimPipelineSet = {
  velocityAdvectPipeline: GPURenderPipeline;
  forceInjectPipeline: GPURenderPipeline;
  divergencePipeline: GPURenderPipeline;
  pressureSolvePipeline: GPURenderPipeline;
  projectPipeline: GPURenderPipeline;
  densityPipeline: GPURenderPipeline;
  velocityAdvectLayout: GPUBindGroupLayout;
  forceInjectLayout: GPUBindGroupLayout;
  divergenceLayout: GPUBindGroupLayout;
  pressureSolveLayout: GPUBindGroupLayout;
  projectLayout: GPUBindGroupLayout;
  densityLayout: GPUBindGroupLayout;
};

type FluidCheckpoint = {
  stepIndex: number;
  velocityTexture: GPUTexture;
  densityTexture: GPUTexture;
  previousPlayers: Map<string, { x: number; y: number }>;
};

export class FluidSim {
  private device: GPUDevice;
  private queue: GPUQueue;
  private pipelines: FluidSimPipelineSet;
  private sampleLayout: GPUBindGroupLayout;

  private readonly simResolution = 256;
  private readonly pressureIterations = 10;

  private bounds: WorldBounds = { minX: -4000, minY: -4000, maxX: 4000, maxY: 4000 };
  private replaySource: ReplayTickSource | null = null;
  private startTick = 0;
  private endTick = 0;
  private ticksPerSecond = 64;
  private simStepTicks = 3;
  private snapshotIntervalSteps = 80;
  private currentStepIndex = -1;
  private resetTicks: number[] = [0];

  private linearSampler: GPUSampler;
  private uniformBuffer: GPUBuffer;
  private sampleParamsBuffer: GPUBuffer;
  private playerBuffer: GPUBuffer;
  private tracerBuffer: GPUBuffer;
  private smokeBuffer: GPUBuffer;

  private velocityTexture!: GPUTexture;
  private velocityView!: GPUTextureView;
  private velocityScratchTexture!: GPUTexture;
  private velocityScratchView!: GPUTextureView;
  private divergenceTexture!: GPUTexture;
  private divergenceView!: GPUTextureView;
  private pressureTextureA!: GPUTexture;
  private pressureViewA!: GPUTextureView;
  private pressureTextureB!: GPUTexture;
  private pressureViewB!: GPUTextureView;
  private densityTexture!: GPUTexture;
  private densityView!: GPUTextureView;
  private densityScratchTexture!: GPUTexture;
  private densityScratchView!: GPUTextureView;

  private sampleBindGroup!: GPUBindGroup;
  private velocityAdvectBindGroup!: GPUBindGroup;
  private forceInjectBindGroup!: GPUBindGroup;
  private divergenceBindGroup!: GPUBindGroup;
  private pressureBindGroupAtoB!: GPUBindGroup;
  private pressureBindGroupBtoA!: GPUBindGroup;
  private projectBindGroup!: GPUBindGroup;
  private densityBindGroup!: GPUBindGroup;

  private maxPlayers = 32;
  private maxTracers = 256;
  private maxSmokes = 32;
  private playerScratch = new Float32Array(this.maxPlayers * 4);
  private tracerScratch = new Float32Array(this.maxTracers * 4);
  private smokeScratch = new Float32Array(this.maxSmokes * 4);
  private previousPlayers = new Map<string, { x: number; y: number }>();

  private checkpoints = new Map<number, FluidCheckpoint>();
  private checkpointSteps: number[] = [];

  constructor(
    device: GPUDevice,
    queue: GPUQueue,
    pipelines: FluidSimPipelineSet,
    sampleLayout: GPUBindGroupLayout,
  ) {
    this.device = device;
    this.queue = queue;
    this.pipelines = pipelines;
    this.sampleLayout = sampleLayout;

    this.linearSampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    this.uniformBuffer = device.createBuffer({
      size: 12 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.sampleParamsBuffer = device.createBuffer({
      size: 12 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.playerBuffer = device.createBuffer({
      size: this.maxPlayers * 4 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.tracerBuffer = device.createBuffer({
      size: this.maxTracers * 4 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.smokeBuffer = device.createBuffer({
      size: this.maxSmokes * 4 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.createTextures();
    this.createBindGroups();
    this.writeSampleParams();
    this.clearStateTextures();
  }

  setBounds(bounds: WorldBounds) {
    this.bounds = bounds;
    this.writeSampleParams();
    this.resetSimulation();
  }

  getSampleBindGroup() {
    return this.sampleBindGroup;
  }

  syncToFrame(frame: RenderFrame) {
    const source = frame.replaySource ?? this.replaySource;
    if (
      source
      && (
        source !== this.replaySource
        || source.getStartTick() !== this.startTick
        || source.getEndTick() !== this.endTick
        || source.ticksPerSecond !== this.ticksPerSecond
      )
    ) {
      this.setReplaySource(source);
    }

    if (!this.replaySource) {
      this.resetSimulation();
      this.runSimulationStep(frame);
      this.currentStepIndex = 0;
      return;
    }

    const targetTick = Math.max(this.startTick, Math.min(Math.floor(frame.tick), this.endTick));
    const targetStepIndex = this.tickToStepIndex(targetTick);
    if (targetStepIndex < 0) {
      this.resetSimulation();
      return;
    }

    const resetStepIndex = this.getResetStepIndexForTick(targetTick);

    if (this.currentStepIndex > targetStepIndex || this.currentStepIndex < resetStepIndex - 1) {
      this.restoreNearestCheckpoint(targetStepIndex, resetStepIndex);
    }

    while (this.currentStepIndex < targetStepIndex) {
      const nextStepIndex = this.currentStepIndex + 1;
      const stepTick = this.stepIndexToTick(nextStepIndex);
      const stepFrame = this.replaySource.getFrameAtTick(stepTick);
      if (stepFrame) {
        this.runSimulationStep(stepFrame);
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
    this.snapshotIntervalSteps = Math.max(1, Math.round((this.ticksPerSecond * 8) / this.simStepTicks));
    this.resetTicks = this.buildResetTicks(source);
    this.resetSimulation();
  }

  private tickToStepIndex(tick: number) {
    if (tick < this.startTick) {
      return -1;
    }
    return Math.floor((tick - this.startTick) / this.simStepTicks);
  }

  private stepIndexToTick(stepIndex: number) {
    return this.startTick + stepIndex * this.simStepTicks;
  }

  private tickToStepIndexCeil(tick: number) {
    if (tick <= this.startTick) {
      return 0;
    }
    return Math.ceil((tick - this.startTick) / this.simStepTicks);
  }

  private buildResetTicks(source: ReplayTickSource) {
    const sourceTicks = source.getSimulationResetTicks?.() ?? [source.getStartTick()];
    const clamped = sourceTicks
      .filter((tick) => Number.isFinite(tick))
      .map((tick) => Math.max(this.startTick, Math.min(tick, this.endTick)));
    const unique = Array.from(new Set(clamped));
    if (!unique.includes(this.startTick)) {
      unique.push(this.startTick);
    }
    unique.sort((a, b) => a - b);
    return unique;
  }

  private getResetTickAtOrBefore(targetTick: number) {
    let resetTick = this.startTick;
    for (const tick of this.resetTicks) {
      if (tick > targetTick) {
        break;
      }
      resetTick = tick;
    }
    return resetTick;
  }

  private getResetStepIndexForTick(targetTick: number) {
    return this.tickToStepIndexCeil(this.getResetTickAtOrBefore(targetTick));
  }

  private resetSimulation() {
    this.currentStepIndex = -1;
    this.previousPlayers.clear();
    this.clearCheckpoints();
    this.clearStateTextures();
  }

  private clearCheckpoints() {
    for (const checkpoint of this.checkpoints.values()) {
      checkpoint.velocityTexture.destroy();
      checkpoint.densityTexture.destroy();
    }
    this.checkpoints.clear();
    this.checkpointSteps = [];
  }

  private restoreNearestCheckpoint(targetStepIndex: number, minStepIndex = 0) {
    let checkpointStep = -1;
    for (const step of this.checkpointSteps) {
      if (step > targetStepIndex) {
        break;
      }
      if (step < minStepIndex) {
        continue;
      }
      checkpointStep = step;
    }

    if (checkpointStep < 0) {
      this.previousPlayers.clear();
      this.currentStepIndex = minStepIndex - 1;
      this.clearStateTextures();
      return;
    }

    const checkpoint = this.checkpoints.get(checkpointStep);
    if (!checkpoint) {
      this.previousPlayers.clear();
      this.currentStepIndex = minStepIndex - 1;
      this.clearStateTextures();
      return;
    }

    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToTexture(
      { texture: checkpoint.velocityTexture },
      { texture: this.velocityTexture },
      [this.simResolution, this.simResolution, 1],
    );
    encoder.copyTextureToTexture(
      { texture: checkpoint.densityTexture },
      { texture: this.densityTexture },
      [this.simResolution, this.simResolution, 1],
    );
    this.queue.submit([encoder.finish()]);

    this.previousPlayers = new Map(checkpoint.previousPlayers);
    this.currentStepIndex = checkpointStep;
  }

  private captureCheckpoint(stepIndex: number) {
    const velocityTexture = this.device.createTexture({
      size: [this.simResolution, this.simResolution, 1],
      format: "rgba16float",
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
    });
    const densityTexture = this.device.createTexture({
      size: [this.simResolution, this.simResolution, 1],
      format: "rgba16float",
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
    });

    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToTexture(
      { texture: this.velocityTexture },
      { texture: velocityTexture },
      [this.simResolution, this.simResolution, 1],
    );
    encoder.copyTextureToTexture(
      { texture: this.densityTexture },
      { texture: densityTexture },
      [this.simResolution, this.simResolution, 1],
    );
    this.queue.submit([encoder.finish()]);

    const existing = this.checkpoints.get(stepIndex);
    if (existing) {
      existing.velocityTexture.destroy();
      existing.densityTexture.destroy();
    } else {
      this.checkpointSteps.push(stepIndex);
      this.checkpointSteps.sort((a, b) => a - b);
    }

    this.checkpoints.set(stepIndex, {
      stepIndex,
      velocityTexture,
      densityTexture,
      previousPlayers: new Map(this.previousPlayers),
    });
  }

  private runSimulationStep(frame: RenderFrame) {
    const dtSec = this.simStepTicks / this.ticksPerSecond;

    this.playerScratch.fill(0);
    let playerCount = 0;
    const nextPlayers = new Map<string, { x: number; y: number }>();
    for (const player of frame.players) {
      if (!player.alive) continue;
      nextPlayers.set(player.steamid, { x: player.x, y: player.y });
      if (playerCount >= this.maxPlayers) continue;

      const prev = this.previousPlayers.get(player.steamid);
      const vx = prev ? (player.x - prev.x) / dtSec : 0;
      const vy = prev ? (player.y - prev.y) / dtSec : 0;
      const base = playerCount * 4;
      this.playerScratch[base + 0] = player.x;
      this.playerScratch[base + 1] = player.y;
      this.playerScratch[base + 2] = vx;
      this.playerScratch[base + 3] = vy;
      playerCount++;
    }
    this.previousPlayers = nextPlayers;
    this.queue.writeBuffer(this.playerBuffer, 0, this.playerScratch);

    this.tracerScratch.fill(0);
    const tracerCount = Math.min(frame.tracers.length, this.maxTracers);
    for (let i = 0; i < tracerCount; i++) {
      const tracer = frame.tracers[i];
      const base = i * 4;
      this.tracerScratch[base + 0] = tracer.x0;
      this.tracerScratch[base + 1] = tracer.y0;
      this.tracerScratch[base + 2] = tracer.x1;
      this.tracerScratch[base + 3] = tracer.y1;
    }
    this.queue.writeBuffer(this.tracerBuffer, 0, this.tracerScratch);

    this.smokeScratch.fill(0);
    const smokeCount = Math.min(frame.smokeSources.length, this.maxSmokes);
    for (let i = 0; i < smokeCount; i++) {
      const smoke = frame.smokeSources[i];
      const base = i * 4;
      this.smokeScratch[base + 0] = smoke.x;
      this.smokeScratch[base + 1] = smoke.y;
      this.smokeScratch[base + 2] = smoke.radius;
      this.smokeScratch[base + 3] = smoke.alpha;
    }
    this.queue.writeBuffer(this.smokeBuffer, 0, this.smokeScratch);

    this.writeUniforms(dtSec, playerCount, tracerCount, smokeCount);

    const encoder = this.device.createCommandEncoder();

    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.velocityScratchView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
      pass.setPipeline(this.pipelines.velocityAdvectPipeline);
      pass.setBindGroup(0, this.velocityAdvectBindGroup);
      pass.draw(3, 1, 0, 0);
      pass.end();
    }

    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.velocityView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
      pass.setPipeline(this.pipelines.forceInjectPipeline);
      pass.setBindGroup(0, this.forceInjectBindGroup);
      pass.draw(3, 1, 0, 0);
      pass.end();
    }

    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.divergenceView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
      pass.setPipeline(this.pipelines.divergencePipeline);
      pass.setBindGroup(0, this.divergenceBindGroup);
      pass.draw(3, 1, 0, 0);
      pass.end();
    }

    for (const view of [this.pressureViewA, this.pressureViewB]) {
      const clearPass = encoder.beginRenderPass({
        colorAttachments: [{
          view,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
      clearPass.end();
    }

    for (let i = 0; i < this.pressureIterations; i++) {
      const writeToA = i % 2 === 1;
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: writeToA ? this.pressureViewA : this.pressureViewB,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
      pass.setPipeline(this.pipelines.pressureSolvePipeline);
      pass.setBindGroup(0, writeToA ? this.pressureBindGroupBtoA : this.pressureBindGroupAtoB);
      pass.draw(3, 1, 0, 0);
      pass.end();
    }

    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.velocityScratchView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
      pass.setPipeline(this.pipelines.projectPipeline);
      pass.setBindGroup(0, this.projectBindGroup);
      pass.draw(3, 1, 0, 0);
      pass.end();
      encoder.copyTextureToTexture(
        { texture: this.velocityScratchTexture },
        { texture: this.velocityTexture },
        [this.simResolution, this.simResolution, 1],
      );
    }

    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.densityScratchView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
      pass.setPipeline(this.pipelines.densityPipeline);
      pass.setBindGroup(0, this.densityBindGroup);
      pass.draw(3, 1, 0, 0);
      pass.end();
      encoder.copyTextureToTexture(
        { texture: this.densityScratchTexture },
        { texture: this.densityTexture },
        [this.simResolution, this.simResolution, 1],
      );
    }

    this.queue.submit([encoder.finish()]);
  }

  private writeUniforms(dtSec: number, playerCount: number, tracerCount: number, smokeCount: number) {
    const values = new Float32Array([
      this.bounds.minX,
      this.bounds.minY,
      this.bounds.maxX,
      this.bounds.maxY,
      dtSec,
      playerCount,
      tracerCount,
      smokeCount,
      0.979,
      150,
      720,
      0.9985,
    ]);
    this.queue.writeBuffer(this.uniformBuffer, 0, values);
  }

  private writeSampleParams() {
    const values = new Float32Array([
      this.bounds.minX,
      this.bounds.minY,
      this.bounds.maxX,
      this.bounds.maxY,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ]);
    this.queue.writeBuffer(this.sampleParamsBuffer, 0, values);
  }

  private createTextures() {
    const createTexture = () => this.device.createTexture({
      size: [this.simResolution, this.simResolution, 1],
      format: "rgba16float",
      usage: GPUTextureUsage.RENDER_ATTACHMENT
        | GPUTextureUsage.TEXTURE_BINDING
        | GPUTextureUsage.COPY_SRC
        | GPUTextureUsage.COPY_DST,
    });

    this.velocityTexture = createTexture();
    this.velocityView = this.velocityTexture.createView();
    this.velocityScratchTexture = createTexture();
    this.velocityScratchView = this.velocityScratchTexture.createView();
    this.divergenceTexture = createTexture();
    this.divergenceView = this.divergenceTexture.createView();
    this.pressureTextureA = createTexture();
    this.pressureViewA = this.pressureTextureA.createView();
    this.pressureTextureB = createTexture();
    this.pressureViewB = this.pressureTextureB.createView();
    this.densityTexture = createTexture();
    this.densityView = this.densityTexture.createView();
    this.densityScratchTexture = createTexture();
    this.densityScratchView = this.densityScratchTexture.createView();
  }

  private createBindGroups() {
    this.sampleBindGroup = this.device.createBindGroup({
      layout: this.sampleLayout,
      entries: [
        { binding: 0, resource: this.linearSampler },
        { binding: 1, resource: this.densityView },
        { binding: 2, resource: { buffer: this.sampleParamsBuffer } },
      ],
    });

    this.velocityAdvectBindGroup = this.device.createBindGroup({
      layout: this.pipelines.velocityAdvectLayout,
      entries: [
        { binding: 0, resource: this.linearSampler },
        { binding: 1, resource: this.velocityView },
        { binding: 2, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.forceInjectBindGroup = this.device.createBindGroup({
      layout: this.pipelines.forceInjectLayout,
      entries: [
        { binding: 0, resource: this.linearSampler },
        { binding: 1, resource: this.velocityScratchView },
        { binding: 2, resource: { buffer: this.uniformBuffer } },
        { binding: 3, resource: { buffer: this.playerBuffer } },
        { binding: 4, resource: { buffer: this.tracerBuffer } },
        { binding: 5, resource: { buffer: this.smokeBuffer } },
      ],
    });

    this.divergenceBindGroup = this.device.createBindGroup({
      layout: this.pipelines.divergenceLayout,
      entries: [
        { binding: 0, resource: this.linearSampler },
        { binding: 1, resource: this.velocityView },
        { binding: 2, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.pressureBindGroupAtoB = this.device.createBindGroup({
      layout: this.pipelines.pressureSolveLayout,
      entries: [
        { binding: 0, resource: this.linearSampler },
        { binding: 1, resource: this.pressureViewA },
        { binding: 2, resource: this.divergenceView },
        { binding: 3, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.pressureBindGroupBtoA = this.device.createBindGroup({
      layout: this.pipelines.pressureSolveLayout,
      entries: [
        { binding: 0, resource: this.linearSampler },
        { binding: 1, resource: this.pressureViewB },
        { binding: 2, resource: this.divergenceView },
        { binding: 3, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.projectBindGroup = this.device.createBindGroup({
      layout: this.pipelines.projectLayout,
      entries: [
        { binding: 0, resource: this.linearSampler },
        { binding: 1, resource: this.velocityView },
        { binding: 2, resource: this.pressureViewA },
        { binding: 3, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.densityBindGroup = this.device.createBindGroup({
      layout: this.pipelines.densityLayout,
      entries: [
        { binding: 0, resource: this.linearSampler },
        { binding: 1, resource: this.densityView },
        { binding: 2, resource: this.velocityView },
        { binding: 3, resource: { buffer: this.uniformBuffer } },
        { binding: 4, resource: { buffer: this.smokeBuffer } },
        { binding: 5, resource: { buffer: this.tracerBuffer } },
      ],
    });
  }

  private clearStateTextures() {
    const encoder = this.device.createCommandEncoder();
    for (const view of [
      this.velocityView,
      this.velocityScratchView,
      this.divergenceView,
      this.pressureViewA,
      this.pressureViewB,
      this.densityView,
      this.densityScratchView,
    ]) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
      pass.end();
    }
    this.queue.submit([encoder.finish()]);
  }
}
