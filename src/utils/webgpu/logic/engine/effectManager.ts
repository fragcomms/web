import type { InfernoExtinguishEvent, PositionedEvent, RenderAreaEffect, RenderSmokeSource } from "../../types";
import { ENGINE_CONFIG } from "./constants";

export type TimedAreaEffect = {
  kind: "smoke" | "inferno" | "he";
  startTick: number;
  endTick: number;
  x: number;
  y: number;
};

export class EffectManager {
  private timedAreaEffects: TimedAreaEffect[] = [];
  private ticksPerSecond: number = 64;
  private areaPool: RenderAreaEffect[] = [];
  private smokePool: RenderSmokeSource[] = [];

  init(
    ticksPerSecond: number,
    heDetonations: PositionedEvent[],
    smokeDetonations: PositionedEvent[],
    infernoStartBurns: PositionedEvent[],
    infernoExpires: PositionedEvent[],
    infernoExtinguishes: InfernoExtinguishEvent[],
  ) {
    this.ticksPerSecond = ticksPerSecond;
    this.timedAreaEffects = [];

    const heDurationTicks = Math.max(1, Math.round(ENGINE_CONFIG.EFFECTS.HE_DURATION_SEC * ticksPerSecond));
    for (const he of heDetonations) {
      this.timedAreaEffects.push({ kind: "he", startTick: he.t, endTick: he.t + heDurationTicks, x: he.x, y: he.y });
    }

    const smokeDurationTicks = Math.round(ENGINE_CONFIG.EFFECTS.SMOKE_DURATION_SEC * ticksPerSecond);
    for (const smoke of smokeDetonations) {
      this.timedAreaEffects.push({
        kind: "smoke",
        startTick: smoke.t,
        endTick: smoke.t + smokeDurationTicks,
        x: smoke.x,
        y: smoke.y,
      });
    }

    const infernoFallbackDurationTicks = Math.round(ENGINE_CONFIG.EFFECTS.INFERNO_FALLBACK_SEC * ticksPerSecond);
    const unmatchedExpires = infernoExpires.slice();
    const unmatchedExtinguishes = infernoExtinguishes.slice();

    const usedExpires = new Set<number>();
    const usedExtinguishes = new Set<number>();

    for (const start of infernoStartBurns) {
      const expireIdx = this.findBestMatchingInfernoEnd(start, unmatchedExpires, usedExpires);
      const extinguishIdx = this.findBestMatchingInfernoEnd(start, unmatchedExtinguishes, usedExtinguishes);

      let endTick = start.t + infernoFallbackDurationTicks;
      if (expireIdx >= 0) {
        endTick = Math.min(endTick, unmatchedExpires[expireIdx].t);
        usedExpires.add(expireIdx);
      }
      if (extinguishIdx >= 0) {
        endTick = Math.min(endTick, unmatchedExtinguishes[extinguishIdx].t);
        usedExtinguishes.add(extinguishIdx);
      }

      this.timedAreaEffects.push({ kind: "inferno", startTick: start.t, endTick, x: start.x, y: start.y });
    }

    this.timedAreaEffects.sort((a, b) => a.startTick - b.startTick);
  }

  private getStartIdxForTick(targetTick: number): number {
    if (this.timedAreaEffects.length === 0) return 0;

    const maxDurationTicks = Math.ceil(ENGINE_CONFIG.EFFECTS.SMOKE_DURATION_SEC * this.ticksPerSecond);
    const minTick = targetTick - maxDurationTicks;

    let lo = 0, hi = this.timedAreaEffects.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.timedAreaEffects[mid].startTick < minTick) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  getEffectsForTick(targetTick: number): RenderAreaEffect[] {
    let count = 0;
    const startIdx = this.getStartIdxForTick(targetTick);

    for (let i = startIdx; i < this.timedAreaEffects.length; i++) {
      const effect = this.timedAreaEffects[i];
      if (effect.startTick > targetTick) break;
      if (effect.endTick <= targetTick) continue;

      if (!this.areaPool[count]) {
        this.areaPool.push({
          kind: "he",
          effectType: 2,
          x: 0,
          y: 0,
          radius: 0,
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
          softness: 0,
          density: 0,
        });
      }
      const outEffect = this.areaPool[count];

      const duration = Math.max(1, effect.endTick - effect.startTick);
      const progress = (targetTick - effect.startTick) / duration;
      const life = 1 - progress;

      outEffect.kind = effect.kind;
      outEffect.x = effect.x;
      outEffect.y = effect.y;

      if (effect.kind === "he") {
        const blastFade = Math.max(0, 1 - progress * 1.85);
        outEffect.effectType = 2;
        outEffect.radius = 74 + progress * 228;
        outEffect.r = 1.0;
        outEffect.g = 0.76;
        outEffect.b = 0.48;
        outEffect.alpha = 1.08 * blastFade * blastFade;
        outEffect.softness = progress;
        outEffect.density = life;
      } else if (effect.kind === "inferno") {
        const flicker = 0.92 + 0.08 * Math.sin(targetTick * 0.09 + effect.x * 0.002);
        outEffect.effectType = 1;
        outEffect.radius = 126 + (1 - life) * 10;
        outEffect.r = 1.0;
        outEffect.g = 0.46 + 0.1 * flicker;
        outEffect.b = 0.05;
        outEffect.alpha = (0.4 + life * 0.28) * flicker;
        outEffect.softness = 0.18;
        outEffect.density = 1.42;
      }
      count++;
    }
    return this.areaPool.slice(0, count);
  }

  getSmokeSourcesForTick(targetTick: number, ticksPerSecond: number): RenderSmokeSource[] {
    let count = 0;
    const startIdx = this.getStartIdxForTick(targetTick);

    for (let i = startIdx; i < this.timedAreaEffects.length; i++) {
      const effect = this.timedAreaEffects[i];
      if (effect.kind !== "smoke") continue;
      if (effect.startTick > targetTick) break;
      if (effect.endTick <= targetTick) continue;

      if (!this.smokePool[count]) {
        this.smokePool.push({ x: 0, y: 0, radius: 0, alpha: 0 });
      }
      const outSmoke = this.smokePool[count];

      const fadeIn = Math.min(1, (targetTick - effect.startTick) / (ticksPerSecond * 0.75));
      const fadeOut = Math.min(1, (effect.endTick - targetTick) / (ticksPerSecond * 1.5));
      const smokeLife = Math.min(fadeIn, fadeOut);

      outSmoke.x = effect.x;
      outSmoke.y = effect.y;
      outSmoke.radius = 212 + fadeIn * 56;
      outSmoke.alpha = 0.58 + smokeLife * 0.38;
      count++;
    }
    return this.smokePool.slice(0, count);
  }

  private findBestMatchingInfernoEnd(
    start: PositionedEvent,
    candidates: Array<PositionedEvent | InfernoExtinguishEvent>,
    usedIndices: Set<number>,
  ): number {
    let bestIdx = -1;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < candidates.length; i++) {
      if (usedIndices.has(i)) continue; // Skip if already claimed by another molotov!

      const candidate = candidates[i];
      if (candidate.t < start.t) continue;

      let score = candidate.t - start.t;
      if (candidate.id != null && candidate.id === start.id) score -= 100000;
      if (candidate.x != null && candidate.y != null) {
        score += Math.hypot(candidate.x - start.x, candidate.y - start.y) * 0.1;
      }
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }
}
