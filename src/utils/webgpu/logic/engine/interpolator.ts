import { ENGINE_CONFIG } from "./constants";
import { lerpAngleDeg } from "./mathUtils";
import type { TimelineTick, RenderPlayer, RenderGrenade, TimelineGrenade } from "../../types";
import type { PlayerManager } from "./playerManager";

export const Interpolator = {
  players(prev: TimelineTick, next: TimelineTick, alpha: number, playerManager: PlayerManager): RenderPlayer[] {
    // If we are exactly on the tick, skip interpolation
    if (alpha === 0 || prev.t === next.t) {
      return prev.p.map((tp) => {
        const roster = playerManager.getInfo(tp[0]);
        return {
          steamid: roster?.steamid ?? String(tp[0]),
          team: roster?.team ?? 2,
          alive: tp[1] > 0,
          hp: tp[1],
          x: tp[2],
          y: tp[3],
          rot: tp[5],
          name: roster?.name ?? "",
        };
      });
    }

    const nextBySid = new Map(next.p.map(p => [p[0], p]));
    const out: RenderPlayer[] = [];

    for (const a of prev.p) {
      const roster = playerManager.getInfo(a[0]);
      const basePlayer = {
        steamid: roster?.steamid ?? String(a[0]),
        team: roster?.team ?? 2,
        alive: a[1] > 0,
        hp: a[1],
        name: roster?.name ?? "",
      };

      const b = nextBySid.get(a[0]);
      if (!b) {
        out.push({ ...basePlayer, x: a[2], y: a[3], rot: a[5] });
        continue;
      }

      const dx = b[2] - a[2];
      const dy = b[3] - a[3];
      const distSq = dx * dx + dy * dy;

      if (distSq > ENGINE_CONFIG.TELEPORT_THRESHOLD_SQ) {
        out.push({ ...basePlayer, x: a[2], y: a[3], rot: a[5] }); // Snap
      } else {
        out.push({
          ...basePlayer,
          x: a[2] + dx * alpha,
          y: a[3] + dy * alpha,
          rot: lerpAngleDeg(a[5], b[5], alpha), // Lerp
        });
      }
    }
    return out;
  },

  grenades(prevG: TimelineGrenade[], nextG: TimelineGrenade[], alpha: number, targetTick: number, roundStartTick: number, heDetonations: { t: number, id: number }[]): RenderGrenade[] {
    const nextByEntityId = new Map(nextG.map(g => [g[0], g]));
    const out: RenderGrenade[] = [];

    // Helper to hide grenades that just detonated
    const isHidden = (ownerId: number, type: number) => {
      if (type !== 1) return false;
      for (const event of heDetonations) {
        if (event.t < roundStartTick) continue;
        if (event.t > targetTick) break;
        if (event.id === ownerId) return true;
      }
      return false;
    };

    for (const a of prevG) {
      if (isHidden(a[1], a[2])) continue;

      const b = nextByEntityId.get(a[0]);
      if (!b || alpha === 0) {
        out.push({ eid: a[0], ownerId: a[1], grenadeType: a[2], x: a[3], y: a[4], z: a[5] });
        continue;
      }

      out.push({
        eid: a[0], ownerId: a[1], grenadeType: a[2],
        x: a[3] + (b[3] - a[3]) * alpha,
        y: a[4] + (b[4] - a[4]) * alpha,
        z: a[5] + (b[5] - a[5]) * alpha,
      });
    }

    return out;
  }
};