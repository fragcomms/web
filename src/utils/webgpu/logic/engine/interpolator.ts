import type { RenderGrenade, RenderPlayer, TimelineGrenade, TimelineTick } from "../../types";
import { ENGINE_CONFIG } from "./constants";
import { lerpAngleDeg } from "./mathUtils";
import type { PlayerManager } from "./playerManager";

export const Interpolator = {
  playerPool: [] as RenderPlayer[],
  grenadePool: [] as RenderGrenade[],

  players(prev: TimelineTick, next: TimelineTick, alpha: number, playerManager: PlayerManager): RenderPlayer[] {
    while (this.playerPool.length < prev.p.length) {
      this.playerPool.push({ steamid: "", team: 2, alive: false, hp: 0, x: 0, y: 0, rot: 0, name: "" });
    }

    for (let i = 0; i < prev.p.length; i++) {
      const a = prev.p[i];
      const sid = a[0];

      const outPlayer = this.playerPool[i];
      const roster = playerManager.getInfo(sid);

      outPlayer.steamid = roster?.steamid ?? String(sid);
      outPlayer.team = roster?.team ?? 2;
      outPlayer.alive = a[1] > 0;
      outPlayer.hp = a[1];
      outPlayer.name = roster?.name ?? "";

      if (alpha === 0 || prev.t === next.t) {
        outPlayer.x = a[2];
        outPlayer.y = a[3];
        outPlayer.rot = a[5];
        continue;
      }

      let b = undefined;
      for (let j = 0; j < next.p.length; j++) {
        if (next.p[j][0] === sid) {
          b = next.p[j];
          break;
        }
      }

      if (!b) {
        outPlayer.x = a[2];
        outPlayer.y = a[3];
        outPlayer.rot = a[5];
        continue;
      }

      const dx = b[2] - a[2];
      const dy = b[3] - a[3];
      const distSq = dx * dx + dy * dy;

      if (distSq > ENGINE_CONFIG.TELEPORT_THRESHOLD_SQ) {
        outPlayer.x = a[2];
        outPlayer.y = a[3];
        outPlayer.rot = a[5];
      } else {
        outPlayer.x = a[2] + dx * alpha;
        outPlayer.y = a[3] + dy * alpha;
        outPlayer.rot = lerpAngleDeg(a[5], b[5], alpha);
      }
    }

    return this.playerPool.slice(0, prev.p.length);
  },

  grenades(
    prevG: TimelineGrenade[],
    nextG: TimelineGrenade[],
    alpha: number,
    targetTick: number,
    heDetonations: { t: number; id: number; }[],
  ): RenderGrenade[] {
    let count = 0;
    
    const isHidden = (ownerId: number, type: number) => {
      if (type !== 1) return false;
      // Linear scan is O(1) fast because heDetonations is capped strictly to the current round
      for (let i = 0; i < heDetonations.length; i++) {
        if (heDetonations[i].t > targetTick) break;
        if (heDetonations[i].id === ownerId) return true;
      }
      return false;
    };

    for (const a of prevG) {
      if (isHidden(a[1], a[2])) continue;

      if (!this.grenadePool[count]) {
        this.grenadePool.push({ eid: 0, ownerId: 0, grenadeType: 0, x: 0, y: 0, z: 0 });
      }
      const outGrenade = this.grenadePool[count];

      const b = nextG.find(g => g[0] === a[0]);
      outGrenade.eid = a[0];
      outGrenade.ownerId = a[1];
      outGrenade.grenadeType = a[2];

      if (!b || alpha === 0) {
        outGrenade.x = a[3];
        outGrenade.y = a[4];
        outGrenade.z = a[5];
      } else {
        outGrenade.x = a[3] + (b[3] - a[3]) * alpha;
        outGrenade.y = a[4] + (b[4] - a[4]) * alpha;
        outGrenade.z = a[5] + (b[5] - a[5]) * alpha;
      }
      count++;
    }

    return this.grenadePool.slice(0, count);
  },
};