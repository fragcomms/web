/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  RenderFrame,
  RenderPlayer,
  RenderTracer,
  ReplayJSON,
  SteamID,
  Team,
  TimelinePlayer,
  TimelineTick,
  WeaponFireEvent,
} from "./types";

type RosterInfo = { steamid: SteamID; team: Team; name: string; };

export class ReplayPlayer {
  private timeline: TimelineTick[] = [];
  private tickNums: number[] = [];
  private startTick = 0;
  private endTick = 0;
  private elapsedSec = 0;

  ticksPerSecond = 64;

  private rosterBySid = new Map<number, RosterInfo>();

  private weaponFire: WeaponFireEvent[] = [];

  setReplay(data: ReplayJSON) {
    const tl = data.timeline;
    if (!Array.isArray(tl)) {
      console.error("Replay JSON missing timeline array. Keys: ", Object.keys(data as any));
      this.timeline = [];
      this.tickNums = [];
      this.weaponFire = [];
      this.startTick = 0;
      this.endTick = 0;
      this.elapsedSec = 0;
      this.rosterBySid.clear();
      return;
    }

    this.timeline = tl;
    this.tickNums = this.timeline.map((t) => t.t);
    this.startTick = this.timeline.length ? this.timeline[0].t : 0;
    this.endTick = this.timeline.length ? this.timeline[this.timeline.length - 1].t : 0;
    this.elapsedSec = 0;

    this.rosterBySid.clear();
    const roster = data.players ?? {};
    for (const [steamidStr, info] of Object.entries(roster)) {
      const sidNum = Number(steamidStr);
      if (!Number.isFinite(sidNum)) continue;
      this.rosterBySid.set(sidNum, { steamid: steamidStr, team: info.team, name: info.name });
    }

    this.weaponFire = (data.events?.weapon_fire ?? []).slice();
    this.weaponFire.sort((a, b) => a.t - b.t);
  }

  getDurationSeconds(): number {
    if (this.endTick <= this.startTick) {
      return 0;
    }
    return (this.endTick - this.startTick) / this.ticksPerSecond;
  }

  getCurrentElapsedSeconds(): number {
    return this.elapsedSec;
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
    if (!this.timeline || this.timeline.length === 0) {
      return null;
    }
    const targetTick = this.startTick + elapsedSec * this.ticksPerSecond;
    const bracket = this.bracketTick(targetTick);
    if (!bracket) {
      return null;
    }
    return this.makeRenderFrame(targetTick, bracket.prev, bracket.next);
  }

  private bracketTick(targetTick: number): { prev: TimelineTick; next: TimelineTick; } | null {
    const n = this.tickNums.length;
    if (n === 0) return null;

    // clamp ends
    if (targetTick <= this.tickNums[0]) {
      const s = this.timeline[0];
      return { prev: s, next: s };
    }
    if (targetTick >= this.tickNums[n - 1]) {
      const s = this.timeline[n - 1];
      return { prev: s, next: s };
    }

    // lower_bound: first idx with tickNums[idx] >= targetTick
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.tickNums[mid] < targetTick) lo = mid + 1;
      else hi = mid;
    }

    const next = this.timeline[lo];
    const prev = this.timeline[lo - 1];
    return { prev, next };
  }

  private makeRenderFrame(targetTick: number, prev: TimelineTick, next: TimelineTick): RenderFrame {
    if (prev.t === next.t) {
      const players = this.tickToRenderPlayers(prev);
      const { tracers } = this.buildTracersForTick(prev.t, players);
      return { tick: prev.t, players, tracers };
    }

    const denom = next.t - prev.t;
    const alphaRaw = denom > 0 ? (targetTick - prev.t) / denom : 0;
    const alpha = Math.min(1, Math.max(0, alphaRaw));

    const nextBySid = new Map<number, TimelinePlayer>();
    for (const p of next.p) nextBySid.set(p[0], p);

    const out: RenderPlayer[] = [];

    for (const a of prev.p) {
      const sid = a[0];
      const hp = a[1];
      const aX = a[2];
      const aY = a[3];
      const aZ = a[4]
      const aRot = a[5];

      const b = nextBySid.get(sid);

      const roster = this.rosterBySid.get(sid);
      const team: Team = roster?.team ?? 2;
      const steamid: SteamID = roster?.steamid ?? String(sid);

      if (!b) {
        out.push({
          steamid,
          team,
          alive: hp > 0,
          x: aX,
          y: aY,
          rot: aRot,
        });
        continue;
      }
      const bX = b[2];
      const bY = b[3];
      const bRot = b[5];

      const dx = bX - aX; 
      const dy = bY - aY; 
      const distSq = dx * dx + dy * dy; // (b.x-a.x)^2 + (b.y-a.y)^2
      const TELEPORT_THRESHOLD_SQ = 6000; // found that this was the perfect threshold to find when the user teleported back to spawn

      if (distSq > TELEPORT_THRESHOLD_SQ) {
        // snap
        out.push({
          steamid,
          team,
          alive: hp > 0,
          x: aX,
          y: aY,
          rot: aRot,
        });
      } else {
        // interpolate
        out.push({
          steamid,
          team,
          alive: hp > 0,
          x: aX + dx * alpha,
          y: aY + dy * alpha,
          rot: lerpAngleDeg(aRot, bRot, alpha),
        });
      }
    }

    const { tracers } = this.buildTracersForTick(targetTick, out);
    return { tick: targetTick, players: out, tracers };
  }

  private tickToRenderPlayers(tick: TimelineTick): RenderPlayer[] {
    const out: RenderPlayer[] = new Array(tick.p.length);

    for (let i = 0; i < tick.p.length; i++) {
      const tp = tick.p[i];
      const sid = tp[0];
      const hp = tp[1];
      const x = tp[2];
      const y = tp[3];
      const z = tp[4];
      const rot = tp[5];
      const roster = this.rosterBySid.get(sid);

      out[i] = {
        steamid: roster?.steamid ?? String(sid),
        team: roster?.team ?? 2,
        alive: hp > 0,
        x,
        y,
        rot,
      };
    }

    return out;
  }

  private buildTracersForTick(
    targetTick: number,
    players: RenderPlayer[],
  ): { tracers: RenderTracer[]; } {
    const tracerLifetimeSec = 0.15;
    const lifetimeTicks = tracerLifetimeSec * this.ticksPerSecond;
    const minTick = targetTick - lifetimeTicks;

    const poseBySteamid = new Map<SteamID, RenderPlayer>();
    for (const p of players) poseBySteamid.set(p.steamid, p);

    const startIdx = lowerBoundWeaponFire(this.weaponFire, minTick);

    const tracers: RenderTracer[] = [];
    for (let i = startIdx; i < this.weaponFire.length; i++) {
      const e = this.weaponFire[i];
      if (e.t > targetTick) break;

      // change id back to steamid
      const shooterInfo = this.rosterBySid.get(e.id);
      const shooter = shooterInfo ? poseBySteamid.get(shooterInfo.steamid) : undefined;
      if (!shooter || !shooter.alive) continue;

      const ageTicks = targetTick - e.t;
      const life = 1 - ageTicks / lifetimeTicks;
      if (life <= 0) continue;

      const len = tracerLengthForWeapon(e.wep);
      const rotRad = shooter.rot * (Math.PI / 180);

      const dx = Math.cos(rotRad);
      const dy = Math.sin(rotRad);

      const muzzle = 24;

      const x0 = shooter.x + dx * muzzle;
      const y0 = shooter.y + dy * muzzle;
      const x1 = x0 + dx * len;
      const y1 = y0 + dy * len;

      tracers.push({
        x0,
        y0,
        x1,
        y1,
        life,
        team: shooter.team,
      });
    }

    return { tracers };
  }
}

function lerpAngleDeg(aDeg: number, bDeg: number, t: number): number {
  const a = wrapDeg(aDeg);
  const b = wrapDeg(bDeg);

  let delta = b - a;
  if (delta > 180) delta -= 360;
  else if (delta < -180) delta += 360;

  return wrapDeg(a + delta * t);
}

function wrapDeg(d: number): number {
  let x = d;
  x = ((x % 360) + 360) % 360;
  if (x >= 180) x -= 360;
  return x;
}

function lowerBoundWeaponFire(arr: { t: number; }[], tick: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].t < tick) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function tracerLengthForWeapon(weapon: string): number {
  if (weapon.includes("awp") || weapon.includes("ssg08")) return 1800;
  if (weapon.includes("ak47") || weapon.includes("m4")) return 1400;
  if (weapon.includes("deagle")) return 1100;
  if (weapon.includes("usp") || weapon.includes("glock") || weapon.includes("p250")) return 900;
  if (weapon.includes("knife")) return 150;
  return 1200;
}
