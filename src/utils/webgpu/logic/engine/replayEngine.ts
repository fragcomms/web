import type { ReplayJSON, TimelineTick, RenderFrame, RoundChunk } from "../../types";
import { ENGINE_CONFIG } from "./constants";
import { Parser } from "./parser";
import { PlayerManager } from "./playerManager";
import { EffectManager } from "./effectManager";
import { TracerManager } from "./tracerManager";
import { Interpolator } from "./interpolator";
import { uniqueSortedTicks } from "./mathUtils";

export class ReplayEngine {
  private rounds: RoundChunk[] = [];
  private activeRoundIndex = -1;
  private playheadIndex = 0;

  private startTick = 0;
  private endTick = 0;
  private elapsedSec = 0;
  private roundStartTicks: number[] = [];

  public ticksPerSecond: number = ENGINE_CONFIG.DEFAULT_TICKS_PER_SEC;

  private playerManager = new PlayerManager();
  private effectManager = new EffectManager();
  private tracerManager = new TracerManager();

  setReplay(data: ReplayJSON) {
    if (!data.timeline || !Array.isArray(data.timeline) || data.timeline.length === 0) {
      this.rounds = [];
      return;
    }

    this.startTick = data.timeline[0].t;
    this.endTick = data.timeline[data.timeline.length - 1].t;
    this.elapsedSec = 0;

    const roundStarts = (data.events?.round_start ?? []).map(e => e.t);
    this.roundStartTicks = uniqueSortedTicks([this.startTick, ...roundStarts]);

    this.rounds = Parser.sliceIntoRounds(data);
    this.playerManager.init(data.players);
    this.loadRound(0);
  }

  private loadRound(index: number) {
    if (this.activeRoundIndex === index || index < 0 || index >= this.rounds.length) return;
    
    this.activeRoundIndex = index;
    this.playheadIndex = 0;
    const round = this.rounds[index];

    this.tracerManager.init(round.events.weapon_fire);
    this.effectManager.init(
      this.ticksPerSecond,
      round.events.hegrenade_detonate,
      round.events.smokegrenade_detonate,
      round.events.inferno_startburn,
      round.events.inferno_expire,
      round.events.inferno_extinguish
    );
  }

  private syncActiveRound(targetTick: number) {
    if (this.rounds.length === 0) return;

    const currentRound = this.rounds[this.activeRoundIndex];
    if (currentRound && targetTick >= currentRound.startTick && targetTick <= currentRound.endTick) {
      return;
    }

    let lo = 0;
    let hi = this.rounds.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const r = this.rounds[mid];
      
      if (targetTick >= r.startTick && targetTick <= r.endTick) {
        this.loadRound(mid);
        return;
      }
      if (r.endTick < targetTick) lo = mid + 1;
      else hi = mid - 1;
    }
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
    if (this.rounds.length === 0) return null;
    const targetTick = Math.max(this.startTick, Math.min(tick, this.endTick));
    
    this.syncActiveRound(targetTick);
    const bracket = this.bracketTick(targetTick);
    if (!bracket) return null;

    return this.makeRenderFrame(targetTick, bracket.prev, bracket.next);
  }

  reset() {
    this.elapsedSec = 0;
    this.playheadIndex = 0;
    this.loadRound(0);
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
    // if random click on timeline, do a binary search to jump there instead
    return this.getFrameAtElapsedSeconds(this.elapsedSec);
  }

  getFrameAtElapsedSeconds(elapsedSec: number): RenderFrame | null {
    if (this.rounds.length === 0) return null;
    const targetTick = this.startTick + elapsedSec * this.ticksPerSecond;
    
    this.syncActiveRound(targetTick);
    const bracket = this.bracketTick(targetTick);
    if (!bracket) return null;
    
    return this.makeRenderFrame(targetTick, bracket.prev, bracket.next);
  }

  getActiveRoundChunk(): RoundChunk | null {
    if (this.activeRoundIndex >= 0 && this.activeRoundIndex < this.rounds.length) {
      return this.rounds[this.activeRoundIndex];
    }
    return null;
  }

  private bracketTick(targetTick: number): { prev: TimelineTick; next: TimelineTick; } | null {
    const activeTimeline = this.rounds[this.activeRoundIndex]?.timeline;
    if (!activeTimeline || activeTimeline.length === 0) return null;

    const n = activeTimeline.length;

    if (targetTick <= activeTimeline[0].t) {
      this.playheadIndex = 0;
      return { prev: activeTimeline[0], next: activeTimeline[0] };
    }
    if (targetTick >= activeTimeline[n - 1].t) {
      this.playheadIndex = n - 1;
      return { prev: activeTimeline[n - 1], next: activeTimeline[n - 1] };
    }

    if (this.playheadIndex >= 0 && this.playheadIndex < n - 1) {
      const currentPlayheadTick = activeTimeline[this.playheadIndex].t;
      if (targetTick >= currentPlayheadTick) {
        if (targetTick - currentPlayheadTick < this.ticksPerSecond * 2) {
          while (this.playheadIndex < n - 1 && activeTimeline[this.playheadIndex + 1].t <= targetTick) {
            this.playheadIndex++;
          }
          return { prev: activeTimeline[this.playheadIndex], next: activeTimeline[this.playheadIndex + 1] };
        }
      }
    }

    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (activeTimeline[mid].t < targetTick) lo = mid + 1;
      else hi = mid;
    }
    
    this.playheadIndex = lo - 1; 
    return { prev: activeTimeline[lo - 1], next: activeTimeline[lo] };
  }

  private makeRenderFrame(targetTick: number, prev: TimelineTick, next: TimelineTick): RenderFrame {
    const denom = next.t - prev.t;
    const alpha = Math.min(1, Math.max(0, denom > 0 ? (targetTick - prev.t) / denom : 0));
    
    const currentRound = this.rounds[this.activeRoundIndex];

    const players = Interpolator.players(prev, next, alpha, this.playerManager);
    
    // We pass the active round's HE detonations so the interpolator can hide exploded nades
    const grenades = Interpolator.grenades(
      prev.g ?? [], 
      next.g ?? [], 
      alpha, 
      targetTick, 
      currentRound.events.hegrenade_detonate
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
