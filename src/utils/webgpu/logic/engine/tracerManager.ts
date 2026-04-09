import type { RenderPlayer, RenderTracer, WeaponFireEvent } from "../../types";
import { ENGINE_CONFIG } from "./constants";
import { lowerBoundWeaponFire, tracerLengthForWeapon } from "./mathUtils";

export class TracerManager {
  private weaponFire: WeaponFireEvent[] = [];
  private tracerPool: RenderTracer[] = [];

  init(weaponFireEvents: WeaponFireEvent[]) {
    this.weaponFire = weaponFireEvents;
  }

  getTracersForTick(
    targetTick: number,
    players: RenderPlayer[],
    ticksPerSecond: number,
    rosterLookup: (id: number) => { steamid: string; } | undefined,
  ): RenderTracer[] {
    let count = 0;
    const lifetimeTicks = ENGINE_CONFIG.TRACER.LIFETIME_SEC * ticksPerSecond;
    const minTick = targetTick - lifetimeTicks;
    const startIdx = lowerBoundWeaponFire(this.weaponFire, minTick);

    for (let i = startIdx; i < this.weaponFire.length; i++) {
      const e = this.weaponFire[i];
      if (e.t > targetTick) break;

      const shooterInfo = rosterLookup(e.id);
      const shooter = shooterInfo ? players.find(p => p.steamid === shooterInfo.steamid) : undefined;
      if (!shooter || !shooter.alive) continue;

      const ageTicks = targetTick - e.t;
      const life = 1 - ageTicks / lifetimeTicks;
      if (life <= 0) continue;

      if (!this.tracerPool[count]) {
        this.tracerPool.push({ x0: 0, y0: 0, x1: 0, y1: 0, life: 0, team: 2 });
      }
      const outTracer = this.tracerPool[count];

      const len = tracerLengthForWeapon(e.wep);
      const rotRad = shooter.rot * (Math.PI / 180);
      const dx = Math.cos(rotRad);
      const dy = Math.sin(rotRad);

      outTracer.x0 = shooter.x + dx * ENGINE_CONFIG.TRACER.MUZZLE_OFFSET;
      outTracer.y0 = shooter.y + dy * ENGINE_CONFIG.TRACER.MUZZLE_OFFSET;
      outTracer.x1 = outTracer.x0 + dx * len;
      outTracer.y1 = outTracer.y0 + dy * len;
      outTracer.life = life;
      outTracer.team = shooter.team;
      count++;
    }

    return this.tracerPool.slice(0, count);
  }
}
