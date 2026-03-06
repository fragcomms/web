import type { ReplayJSON, TimelineTick, TimelinePlayer, RenderFrame, RenderPlayer, Team, SteamID } from "./types";

type RosterInfo = { steamid: SteamID; team: Team; name: string };

export class ReplayPlayer {
    private timeline: TimelineTick[] = [];
    private tickNums: number[] = [];
    private startTick = 0;

    private elapsedSec = 0; 

    ticksPerSecond = 64;

    private rosterBySid = new Map<number, RosterInfo>();

    setReplay(data: ReplayJSON) {
        const tl = data.timeline;
        if (!Array.isArray(tl)) {
            console.error("Replay JSON missing timeline array. Keys: ", Object.keys(data as any));
            this.timeline = [];
            this.tickNums = [];
            this.startTick = 0;
            this.elapsedSec = 0;
            this.rosterBySid.clear();
            return;
        }

        this.timeline = tl;
        this.tickNums = this.timeline.map((t) => t.tick);
        this.startTick = this.timeline.length ? this.timeline[0].tick : 0;
        this.elapsedSec = 0;

        this.rosterBySid.clear();
        const roster = data.players ?? {};
        for (const [steamidStr, info] of Object.entries(roster)) {
            const sidNum = Number(steamidStr);
            if(!Number.isFinite(sidNum)) continue;
            this.rosterBySid.set(sidNum, { steamid: steamidStr, team: info.team, name: info.name });
        }

    }

    reset() {
        this.elapsedSec = 0;
    }

    advance(dtSec: number): RenderFrame | null {
        if (dtSec > 0){
            this.elapsedSec += dtSec;
        }
        return this.getFrameAtElapsedSeconds(this.elapsedSec);
    }

    seekToElapsedSeconds(sec: number): RenderFrame | null {
        this.elapsedSec = Math.max(0, sec);
        return this.getFrameAtElapsedSeconds(this.elapsedSec);
    }

    getFrameAtElapsedSeconds(elapsedSec: number): RenderFrame | null {
        if (!this.timeline || this.timeline.length === 0){
            return null;
        }
        const targetTick = this.startTick + elapsedSec * this.ticksPerSecond;
        const bracket = this.bracketTick(targetTick);
        if (!bracket) {
            return null;
        }
        return this.makeRenderFrame(targetTick, bracket.prev, bracket.next);
    }

    private bracketTick(targetTick: number): { prev: TimelineTick; next: TimelineTick } | null {
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
        if (prev.tick === next.tick) {
            return { tick: prev.tick, players: this.tickToRenderPlayers(prev) };
        }

        const denom = next.tick - prev.tick;
        const alphaRaw = denom > 0 ? (targetTick - prev.tick) / denom : 0;
        const alpha = Math.min(1, Math.max(0, alphaRaw));

        const nextBySid = new Map<number, TimelinePlayer>();
        for (const p of next.p) nextBySid.set(p.sid, p);

        const out: RenderPlayer[] = [];

        for (const a of prev.p) {
            const b = nextBySid.get(a.sid);

            const roster = this.rosterBySid.get(a.sid);
            const team: Team = roster?.team ?? 2;
            const steamid: SteamID = roster?.steamid ?? String(a.sid);

            if (!b) {
                out.push({
                    steamid,
                    team,
                    alive: a.hp >0,
                    x: a.x,
                    y: a.y,
                    rot: a.rot,
                });
                continue;
            }

            out.push({
                steamid,
                team,
                alive: a.hp > 0,
                x: a.x + (b.x - a.x) * alpha,
                y: a.y + (b.y - a.y) * alpha,
                rot: lerpAngleDeg(a.rot, b.rot, alpha),
            });
        }

        return { tick: targetTick, players: out };
    }

    private tickToRenderPlayers(tick: TimelineTick): RenderPlayer[] {
        const out: RenderPlayer[] = new Array(tick.p.length);

        for (let i = 0; i < tick.p.length; i++) {
            const tp = tick.p[i];
            const roster = this.rosterBySid.get(tp.sid);

            out[i] = {
                steamid: roster?.steamid ?? String(tp.sid),
                team: roster?.team ?? 2,
                alive: tp.hp >0,
                x: tp.x,
                y: tp.y,
                rot: tp.rot,
            };
        }

        return out;
    }

}

function lerpAngleDeg(aDeg: number, bDeg: number, t: number): number{
    const a = wrapDeg(aDeg);
    const b = wrapDeg(bDeg);

    let delta = b - a;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;

    return wrapDeg(a + delta * t);
}

function wrapDeg(d: number): number{
    let x = d;
    x = ((x % 360) + 360) % 360;
    if (x >= 180) x -= 360;
    return x;
}