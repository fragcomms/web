import type {
  InfernoExtinguishEvent,
  PositionedEvent,
  RenderAreaEffect,
  RenderFrame,
  RenderGrenade,
  RenderPlayer,
  RenderSmokeSource,
  RenderTracer,
  ReplayJSON,
  SteamID,
  Team,
  TimelineGrenade,
  TimelinePlayer,
  TimelineTick,
  WeaponFireEvent,
} from "./types";

type RosterInfo = { steamid: SteamID; team: Team; name: string; };
type TimedAreaEffect = {
  kind: "smoke" | "inferno";
  startTick: number;
  endTick: number;
  x: number;
  y: number;
};

export class ReplayPlayer {
  private timeline: TimelineTick[] = [];
  private tickNums: number[] = [];
  private startTick = 0;
  private endTick = 0;
  private elapsedSec = 0;
  private roundStartTicks: number[] = [];

  ticksPerSecond = 64;

  private rosterBySid = new Map<number, RosterInfo>();

  private weaponFire: WeaponFireEvent[] = [];
  private smokeDetonations: PositionedEvent[] = [];
  private infernoStartBurns: PositionedEvent[] = [];
  private infernoExpires: PositionedEvent[] = [];
  private infernoExtinguishes: InfernoExtinguishEvent[] = [];
  private timedAreaEffects: TimedAreaEffect[] = [];

  setReplay(data: ReplayJSON) {
    const tl = data.timeline;
    if (!Array.isArray(tl)) {
      console.error("Replay JSON missing timeline array. Keys: ", Object.keys(data as any));
      this.timeline = [];
      this.tickNums = [];
      this.weaponFire = [];
      this.smokeDetonations = [];
      this.infernoStartBurns = [];
      this.infernoExpires = [];
      this.infernoExtinguishes = [];
      this.timedAreaEffects = [];
      this.startTick = 0;
      this.endTick = 0;
      this.elapsedSec = 0;
      this.roundStartTicks = [];
      this.rosterBySid.clear();
      return;
    }

    this.timeline = tl;
    this.tickNums = this.timeline.map((t) => t.t);
    this.startTick = this.timeline.length ? this.timeline[0].t : 0;
    this.endTick = this.timeline.length ? this.timeline[this.timeline.length - 1].t : 0;
    this.elapsedSec = 0;
    this.roundStartTicks = [];

    this.rosterBySid.clear();
    const roster = data.players ?? {};
    for (const [tinyIdStr, info] of Object.entries(roster)) {
      const sidNum = Number(tinyIdStr);
      if (!Number.isFinite(sidNum)) continue;
      this.rosterBySid.set(sidNum, { steamid: info.sid, team: info.team, name: info.name });
    }

    // to keep track of who died, and keep them rendered until next round
    const lastKnownState = new Map<number, TimelinePlayer>();
    for (const t of this.timeline) {
      for (const p of t.p) {
        lastKnownState.set(p[0], p) // 0 is id
      }
      if (t.p.length < lastKnownState.size) {
        const currentSids = new Set(t.p.map((p) => p[0]))
        for (const [sid, p] of lastKnownState.entries()) {
          if (!currentSids.has(sid)) {
            t.p.push([...p] as TimelinePlayer);
          }
        }
      }
    }

    this.weaponFire = (data.events?.weapon_fire ?? []).slice();
    this.weaponFire.sort((a, b) => a.t - b.t);

    this.smokeDetonations = (data.events?.smokegrenade_detonate ?? []).slice().sort((a, b) => a.t - b.t);
    this.infernoStartBurns = (data.events?.inferno_startburn ?? []).slice().sort((a, b) => a.t - b.t);
    this.infernoExpires = (data.events?.inferno_expire ?? []).slice().sort((a, b) => a.t - b.t);
    this.infernoExtinguishes = (data.events?.inferno_extinguish ?? []).slice().sort((a, b) => a.t - b.t);
    this.roundStartTicks = uniqueSortedTicks([
      this.startTick,
      ...(data.events?.round_start ?? []).map((event) => event.t),
    ]);
    this.timedAreaEffects = this.buildTimedAreaEffects();
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

  getStartTick(): number {
    return this.startTick;
  }

  getEndTick(): number {
    return this.endTick;
  }

  getSimulationResetTicks(): number[] {
    return this.roundStartTicks.length ? this.roundStartTicks : [this.startTick];
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

  getFrameAtTick(tick: number): RenderFrame | null {
    if (!this.timeline || this.timeline.length === 0) {
      return null;
    }
    const targetTick = Math.max(this.startTick, Math.min(tick, this.endTick));
    const bracket = this.bracketTick(targetTick);
    if (!bracket) {
      return null;
    }
    return this.makeRenderFrame(targetTick, bracket.prev, bracket.next);
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
      const grenades = this.tickToRenderGrenades(prev);
      const areaEffects = this.buildAreaEffectsForTick(prev.t);
      const smokeSources = this.buildSmokeSourcesForTick(prev.t);
      const { tracers } = this.buildTracersForTick(prev.t, players);
      return {
        tick: prev.t,
        players,
        grenades,
        areaEffects,
        smokeSources,
        tracers,
        replaySource: this,
      };
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
      // const aZ = a[4];
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
          hp,
          name: roster?.name ?? "",
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
          hp,
          name: roster?.name ?? "",
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
          hp,
          name: roster?.name ?? "",
        });
      }
    }

    const grenades = this.interpolateGrenades(prev.g ?? [], next.g ?? [], alpha);
    const areaEffects = this.buildAreaEffectsForTick(targetTick);
    const smokeSources = this.buildSmokeSourcesForTick(targetTick);
    const { tracers } = this.buildTracersForTick(targetTick, out);
    return {
      tick: targetTick,
      players: out,
      grenades,
      areaEffects,
      smokeSources,
      tracers,
      replaySource: this,
    };
  }

  private tickToRenderPlayers(tick: TimelineTick): RenderPlayer[] {
    const out: RenderPlayer[] = new Array(tick.p.length);

    for (let i = 0; i < tick.p.length; i++) {
      const tp = tick.p[i];
      const sid = tp[0];
      const hp = tp[1];
      const x = tp[2];
      const y = tp[3];
      // const z = tp[4];
      const rot = tp[5];
      const roster = this.rosterBySid.get(sid);

      out[i] = {
        steamid: roster?.steamid ?? String(sid),
        team: roster?.team ?? 2,
        alive: hp > 0,
        x,
        y,
        rot,
        hp,
        name: roster?.name ?? "",

      };
    }

    return out;
  }

  private tickToRenderGrenades(tick: TimelineTick): RenderGrenade[] {
    const grenades = tick.g ?? [];
    const out: RenderGrenade[] = new Array(grenades.length);

    for (let i = 0; i < grenades.length; i++) {
      const grenade = grenades[i];
      out[i] = {
        eid: grenade[0],
        ownerId: grenade[1],
        grenadeType: grenade[2],
        x: grenade[3],
        y: grenade[4],
        z: grenade[5],
      };
    }

    return out;
  }

  private interpolateGrenades(
    prevGrenades: TimelineGrenade[],
    nextGrenades: TimelineGrenade[],
    alpha: number,
  ): RenderGrenade[] {
    const nextByEntityId = new Map<number, TimelineGrenade>();
    for (const grenade of nextGrenades) {
      nextByEntityId.set(grenade[0], grenade);
    }

    const out: RenderGrenade[] = [];

    for (const grenade of prevGrenades) {
      const eid = grenade[0];
      const ownerId = grenade[1];
      const grenadeType = grenade[2];
      const aX = grenade[3];
      const aY = grenade[4];
      const aZ = grenade[5];

      const nextGrenade = nextByEntityId.get(eid);
      if (!nextGrenade) {
        out.push({
          eid,
          ownerId,
          grenadeType,
          x: aX,
          y: aY,
          z: aZ,
        });
        continue;
      }

      out.push({
        eid,
        ownerId,
        grenadeType,
        x: aX + (nextGrenade[3] - aX) * alpha,
        y: aY + (nextGrenade[4] - aY) * alpha,
        z: aZ + (nextGrenade[5] - aZ) * alpha,
      });
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

  private buildTimedAreaEffects(): TimedAreaEffect[] {
    const effects: TimedAreaEffect[] = [];

    const smokeDurationTicks = Math.round(18 * this.ticksPerSecond);
    for (const smoke of this.smokeDetonations) {
      effects.push({
        kind: "smoke",
        startTick: smoke.t,
        endTick: smoke.t + smokeDurationTicks,
        x: smoke.x,
        y: smoke.y,
      });
    }

    const infernoFallbackDurationTicks = Math.round(7 * this.ticksPerSecond);
    const unmatchedExpires = this.infernoExpires.slice();
    const unmatchedExtinguishes = this.infernoExtinguishes.slice();

    for (const start of this.infernoStartBurns) {
      const expireIdx = this.findBestMatchingInfernoEnd(start, unmatchedExpires);
      const extinguishIdx = this.findBestMatchingInfernoEnd(start, unmatchedExtinguishes);

      let endTick = start.t + infernoFallbackDurationTicks;

      if (expireIdx >= 0) {
        endTick = Math.min(endTick, unmatchedExpires[expireIdx].t);
      }
      if (extinguishIdx >= 0) {
        endTick = Math.min(endTick, unmatchedExtinguishes[extinguishIdx].t);
      }

      if (expireIdx >= 0) unmatchedExpires.splice(expireIdx, 1);
      if (extinguishIdx >= 0) unmatchedExtinguishes.splice(extinguishIdx, 1);

      effects.push({
        kind: "inferno",
        startTick: start.t,
        endTick,
        x: start.x,
        y: start.y,
      });
    }

    effects.sort((a, b) => a.startTick - b.startTick);
    return effects;
  }

  private findBestMatchingInfernoEnd(
    start: PositionedEvent,
    candidates: Array<PositionedEvent | InfernoExtinguishEvent>,
  ): number {
    let bestIdx = -1;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (candidate.t < start.t) continue;

      let score = candidate.t - start.t;

      if (candidate.id != null && candidate.id === start.id) {
        score -= 100000;
      }

      if (candidate.x != null && candidate.y != null) {
        const dx = candidate.x - start.x;
        const dy = candidate.y - start.y;
        score += Math.hypot(dx, dy) * 0.1;
      }

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  private buildAreaEffectsForTick(targetTick: number): RenderAreaEffect[] {
    const effects: RenderAreaEffect[] = [];

    for (const effect of this.timedAreaEffects) {
      if (effect.startTick > targetTick) {
        break;
      }
      if (effect.endTick <= targetTick) {
        continue;
      }

      const duration = Math.max(1, effect.endTick - effect.startTick);
      const progress = (targetTick - effect.startTick) / duration;
      const life = 1 - progress;

      if (effect.kind === "smoke") {
        continue;
      }

      const flicker = 0.92 + 0.08 * Math.sin(targetTick * 0.09 + effect.x * 0.002);
      effects.push({
        kind: "inferno",
        effectType: 1,
        x: effect.x,
        y: effect.y,
        radius: 126 + (1 - life) * 10,
        r: 1.0,
        g: 0.46 + 0.1 * flicker,
        b: 0.05,
        alpha: (0.4 + life * 0.28) * flicker,
        softness: 0.18,
        density: 1.42,
      });
    }

    return effects;
  }

  private buildSmokeSourcesForTick(targetTick: number): RenderSmokeSource[] {
    const sources: RenderSmokeSource[] = [];

    for (const effect of this.timedAreaEffects) {
      if (effect.kind !== "smoke") {
        continue;
      }
      if (effect.startTick > targetTick) {
        break;
      }
      if (effect.endTick <= targetTick) {
        continue;
      }

      const fadeIn = Math.min(1, (targetTick - effect.startTick) / (this.ticksPerSecond * 0.75));
      const fadeOut = Math.min(1, (effect.endTick - targetTick) / (this.ticksPerSecond * 1.5));
      const smokeLife = Math.min(fadeIn, fadeOut);

      sources.push({
        x: effect.x,
        y: effect.y,
        radius: 212 + fadeIn * 56,
        alpha: 0.58 + smokeLife * 0.38,
      });
    }

    return sources;
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

function uniqueSortedTicks(ticks: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const tick of ticks) {
    if (!Number.isFinite(tick) || seen.has(tick)) continue;
    seen.add(tick);
    out.push(tick);
  }
  out.sort((a, b) => a - b);
  return out;
}

function tracerLengthForWeapon(weapon: string): number {
  if (weapon.includes("awp") || weapon.includes("ssg08")) return 1800;
  if (weapon.includes("ak47") || weapon.includes("m4")) return 1400;
  if (weapon.includes("deagle")) return 1100;
  if (weapon.includes("usp") || weapon.includes("glock") || weapon.includes("p250")) return 900;
  if (weapon.includes("knife")) return 150;
  return 1200;
}
