import { ENGINE_CONFIG } from "./constants";
import { lowerBoundWeaponFire, tracerLengthForWeapon } from "./mathUtils";
import type { WeaponFireEvent, RenderTracer, RenderPlayer } from "../../types";

export class TracerManager {
  private weaponFire: WeaponFireEvent[] = [];

  init(weaponFireEvents: WeaponFireEvent[]) {
    this.weaponFire = weaponFireEvents;
  }

  getTracersForTick(
    targetTick: number, 
    players: RenderPlayer[], 
    ticksPerSecond: number,
    rosterLookup: (id: number) => { steamid: string } | undefined
  ): RenderTracer[] {
    const lifetimeTicks = ENGINE_CONFIG.TRACER.LIFETIME_SEC * ticksPerSecond;
    const minTick = targetTick - lifetimeTicks;

    const poseBySteamid = new Map<string, RenderPlayer>();
    for (const p of players) poseBySteamid.set(p.steamid, p);

    const startIdx = lowerBoundWeaponFire(this.weaponFire, minTick);
    const tracers: RenderTracer[] = [];

    for (let i = startIdx; i < this.weaponFire.length; i++) {
      const e = this.weaponFire[i];
      if (e.t > targetTick) break;

      const shooterInfo = rosterLookup(e.id);
      const shooter = shooterInfo ? poseBySteamid.get(shooterInfo.steamid) : undefined;
      if (!shooter || !shooter.alive) continue;

      const ageTicks = targetTick - e.t;
      const life = 1 - ageTicks / lifetimeTicks;
      if (life <= 0) continue;

      const len = tracerLengthForWeapon(e.wep);
      const rotRad = shooter.rot * (Math.PI / 180);
      const dx = Math.cos(rotRad);
      const dy = Math.sin(rotRad);

      const x0 = shooter.x + dx * ENGINE_CONFIG.TRACER.MUZZLE_OFFSET;
      const y0 = shooter.y + dy * ENGINE_CONFIG.TRACER.MUZZLE_OFFSET;

      tracers.push({
        x0, y0,
        x1: x0 + dx * len,
        y1: y0 + dy * len,
        life,
        team: shooter.team,
      });
    }

    return tracers;
  }
}