import { ENGINE_CONFIG } from "./constants";
import { Parser } from "./parser";
import { PlayerManager } from "./playerManager";
import { EffectManager } from "./effectManager";
import { TracerManager } from "./tracerManager";
import { Interpolator } from "./interpolator";
import { uniqueSortedTicks } from "./mathUtils";
import type { ReplayJSON, TimelineTick, RenderFrame, PositionedEvent } from "../../types";

export class ReplayEngine {
  private timeline: TimelineTick[] = [];
  private tickNums: number[] = [];
  private startTick = 0;
  private endTick = 0;
  private elapsedSec = 0;
  private roundStartTicks: number[] = [];
  
  private rawHeDetonations: PositionedEvent[] = [];

  public ticksPerSecond: number = ENGINE_CONFIG.DEFAULT_TICKS_PER_SEC;

  private playerManager = new PlayerManager();
  private effectManager = new EffectManager();
  private tracerManager = new TracerManager();

  setReplay(data: ReplayJSON) {
    if (!data.timeline || !Array.isArray(data.timeline)) {
      this.timeline = [];
      this.tickNums = [];
      return;
    }

    this.timeline = Parser.patchMissingTimelinePlayers(data.timeline);
    this.tickNums = this.timeline.map((t) => t.t);
    this.startTick = this.timeline.length ? this.timeline[0].t : 0;
    this.endTick = this.timeline.length ? this.timeline[this.timeline.length - 1].t : 0;
    this.elapsedSec = 0;

    const roundStarts = (data.events?.round_start ?? []).map(e => e.t);
    this.roundStartTicks = uniqueSortedTicks([this.startTick, ...roundStarts]);

    this.rawHeDetonations = Parser.safeExtract(data.events?.hegrenade_detonate);
    const smokeDetonations = Parser.safeExtract(data.events?.smokegrenade_detonate);
    const infernoStarts = Parser.safeExtract(data.events?.inferno_startburn);
    const infernoExpires = Parser.safeExtract(data.events?.inferno_expire);
    const infernoExtinguishes = Parser.safeExtract(data.events?.inferno_extinguish);
    const weaponFire = Parser.safeExtract(data.events?.weapon_fire);

    this.playerManager.init(data.players);
    this.tracerManager.init(weaponFire);
    this.effectManager.init(
      this.ticksPerSecond,
      this.rawHeDetonations,
      smokeDetonations,
      infernoStarts,
      infernoExpires,
      infernoExtinguishes
    );
  }

  getDurationSeconds(): number {
    if (this.endTick <= this.startTick) return 0;
    return (this.endTick - this.startTick) / this.ticksPerSecond;
  }

  getCurrentElapsedSeconds(): number {
    return this.elapsedSec;
  }

  getStartTick(): number {
    return this.startTick;
  }

  getEndTick(): number {
    return this.endTick;
  }

  getSimulationResetTicks(): number[] {
    return this.roundStartTicks.length ? this.roundStartTicks : [this.startTick];
  }

  getFrameAtTick(tick: number): RenderFrame | null {
    if (this.timeline.length === 0) return null;
    
    // Clamp the requested tick to our available timeline
    const targetTick = Math.max(this.startTick, Math.min(tick, this.endTick));
    const bracket = this.bracketTick(targetTick);
    
    if (!bracket) return null;

    return this.makeRenderFrame(targetTick, bracket.prev, bracket.next);
  }

  reset() {
    this.elapsedSec = 0;
  }

  advance(dtSec: number): RenderFrame | null {
    if (dtSec > 0) {
      const duration = this.getDurationSeconds();
      this.elapsedSec = Math.min(this.elapsedSec + dtSec, duration);
    }
    return this.getFrameAtElapsedSeconds(this.elapsedSec);
  }

  seekToElapsedSeconds(sec: number): RenderFrame | null {
    const duration = this.getDurationSeconds();
    this.elapsedSec = Math.max(0, Math.min(sec, duration));
    return this.getFrameAtElapsedSeconds(this.elapsedSec);
  }

  getFrameAtElapsedSeconds(elapsedSec: number): RenderFrame | null {
    if (this.timeline.length === 0) return null;
    const targetTick = this.startTick + elapsedSec * this.ticksPerSecond;
    const bracket = this.bracketTick(targetTick);
    if (!bracket) return null;
    
    return this.makeRenderFrame(targetTick, bracket.prev, bracket.next);
  }

  private bracketTick(targetTick: number): { prev: TimelineTick; next: TimelineTick; } | null {
    const n = this.tickNums.length;
    if (n === 0) return null;

    if (targetTick <= this.tickNums[0]) return { prev: this.timeline[0], next: this.timeline[0] };
    if (targetTick >= this.tickNums[n - 1]) return { prev: this.timeline[n - 1], next: this.timeline[n - 1] };

    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.tickNums[mid] < targetTick) lo = mid + 1;
      else hi = mid;
    }

    return { prev: this.timeline[lo - 1], next: this.timeline[lo] };
  }

  private getRoundStartTickForTick(targetTick: number): number {
    let roundStartTick = this.startTick;
    for (const tick of this.roundStartTicks) {
      if (tick > targetTick) break;
      roundStartTick = tick;
    }
    return roundStartTick;
  }

  private makeRenderFrame(targetTick: number, prev: TimelineTick, next: TimelineTick): RenderFrame {
    const denom = next.t - prev.t;
    const alpha = Math.min(1, Math.max(0, denom > 0 ? (targetTick - prev.t) / denom : 0));
    const roundStartTick = this.getRoundStartTickForTick(targetTick);

    const players = Interpolator.players(prev, next, alpha, this.playerManager);
    const grenades = Interpolator.grenades(
      prev.g ?? [], 
      next.g ?? [], 
      alpha, 
      targetTick, 
      roundStartTick, 
      this.rawHeDetonations
    );

    return {
      tick: targetTick,
      players,
      grenades,
      areaEffects: this.effectManager.getEffectsForTick(targetTick),
      smokeSources: this.effectManager.getSmokeSourcesForTick(targetTick, this.ticksPerSecond),
      tracers: this.tracerManager.getTracersForTick(
        targetTick, 
        players, 
        this.ticksPerSecond, 
        (id) => this.playerManager.getInfo(id)
      ),
      replaySource: this as any, 
    };
  }
}