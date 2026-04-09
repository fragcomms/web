import { ENGINE_CONFIG } from "./constants";
import type { PositionedEvent, InfernoExtinguishEvent, RenderAreaEffect, RenderSmokeSource } from "../../types";

export type TimedAreaEffect = {
  kind: "smoke" | "inferno" | "he";
  startTick: number;
  endTick: number;
  x: number;
  y: number;
};

export class EffectManager {
  private timedAreaEffects: TimedAreaEffect[] = [];

  init(
    ticksPerSecond: number,
    heDetonations: PositionedEvent[],
    smokeDetonations: PositionedEvent[],
    infernoStartBurns: PositionedEvent[],
    infernoExpires: PositionedEvent[],
    infernoExtinguishes: InfernoExtinguishEvent[]
  ) {
    this.timedAreaEffects = [];

    const heDurationTicks = Math.max(1, Math.round(ENGINE_CONFIG.EFFECTS.HE_DURATION_SEC * ticksPerSecond));
    for (const he of heDetonations) {
      this.timedAreaEffects.push({ kind: "he", startTick: he.t, endTick: he.t + heDurationTicks, x: he.x, y: he.y });
    }

    const smokeDurationTicks = Math.round(ENGINE_CONFIG.EFFECTS.SMOKE_DURATION_SEC * ticksPerSecond);
    for (const smoke of smokeDetonations) {
      this.timedAreaEffects.push({ kind: "smoke", startTick: smoke.t, endTick: smoke.t + smokeDurationTicks, x: smoke.x, y: smoke.y });
    }

    const infernoFallbackDurationTicks = Math.round(ENGINE_CONFIG.EFFECTS.INFERNO_FALLBACK_SEC * ticksPerSecond);
    const unmatchedExpires = infernoExpires.slice();
    const unmatchedExtinguishes = infernoExtinguishes.slice();

    for (const start of infernoStartBurns) {
      const expireIdx = this.findBestMatchingInfernoEnd(start, unmatchedExpires);
      const extinguishIdx = this.findBestMatchingInfernoEnd(start, unmatchedExtinguishes);

      let endTick = start.t + infernoFallbackDurationTicks;
      if (expireIdx >= 0) endTick = Math.min(endTick, unmatchedExpires[expireIdx].t);
      if (extinguishIdx >= 0) endTick = Math.min(endTick, unmatchedExtinguishes[extinguishIdx].t);

      if (expireIdx >= 0) unmatchedExpires.splice(expireIdx, 1);
      if (extinguishIdx >= 0) unmatchedExtinguishes.splice(extinguishIdx, 1);

      this.timedAreaEffects.push({ kind: "inferno", startTick: start.t, endTick, x: start.x, y: start.y });
    }

    this.timedAreaEffects.sort((a, b) => a.startTick - b.startTick);
  }

  getEffectsForTick(targetTick: number): RenderAreaEffect[] {
    const effects: RenderAreaEffect[] = [];
    for (const effect of this.timedAreaEffects) {
      if (effect.startTick > targetTick) break;
      if (effect.endTick <= targetTick) continue;

      const duration = Math.max(1, effect.endTick - effect.startTick);
      const progress = (targetTick - effect.startTick) / duration;
      const life = 1 - progress;

      if (effect.kind === "he") {
        const blastFade = Math.max(0, 1 - progress * 1.85);
        effects.push({
          kind: "he", effectType: 2, x: effect.x, y: effect.y,
          radius: 74 + progress * 228, r: 1.0, g: 0.76, b: 0.48,
          alpha: 1.08 * blastFade * blastFade, softness: progress, density: life,
        });
      } else if (effect.kind === "inferno") {
        const flicker = 0.92 + 0.08 * Math.sin(targetTick * 0.09 + effect.x * 0.002);
        effects.push({
          kind: "inferno", effectType: 1, x: effect.x, y: effect.y,
          radius: 126 + (1 - life) * 10, r: 1.0, g: 0.46 + 0.1 * flicker, b: 0.05,
          alpha: (0.4 + life * 0.28) * flicker, softness: 0.18, density: 1.42,
        });
      }
    }
    return effects;
  }

  getSmokeSourcesForTick(targetTick: number, ticksPerSecond: number): RenderSmokeSource[] {
    const sources: RenderSmokeSource[] = [];
    for (const effect of this.timedAreaEffects) {
      if (effect.kind !== "smoke") continue;
      if (effect.startTick > targetTick) break;
      if (effect.endTick <= targetTick) continue;

      const fadeIn = Math.min(1, (targetTick - effect.startTick) / (ticksPerSecond * 0.75));
      const fadeOut = Math.min(1, (effect.endTick - targetTick) / (ticksPerSecond * 1.5));
      const smokeLife = Math.min(fadeIn, fadeOut);

      sources.push({ x: effect.x, y: effect.y, radius: 212 + fadeIn * 56, alpha: 0.58 + smokeLife * 0.38 });
    }
    return sources;
  }

  private findBestMatchingInfernoEnd(start: PositionedEvent, candidates: Array<PositionedEvent | InfernoExtinguishEvent>): number {
    let bestIdx = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (candidate.t < start.t) continue;

      let score = candidate.t - start.t;
      if (candidate.id != null && candidate.id === start.id) score -= 100000;
      if (candidate.x != null && candidate.y != null) {
        score += Math.hypot(candidate.x - start.x, candidate.y - start.y) * 0.1;
      }
      if (score < bestScore) { bestScore = score; bestIdx = i; }
    }
    return bestIdx;
  }
}