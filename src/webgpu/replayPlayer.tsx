import type { ReplayJSON, TickSnapshot, RenderFrame, RenderPlayer } from "./types";

export class ReplayPlayer {
    private ticks: TickSnapshot[] = [];
    private tickNums: number[] = [];
    private startTick = 0;

    private elapsedSec = 0; 

    ticksPerSecond = 64;

    setReplay(data: ReplayJSON) {
        this.ticks = data.ticks;
        this.tickNums = data.ticks.map(t => t.tick);
        this.startTick = this.ticks.length ? this.ticks[0].tick : 0;
        this.elapsedSec = 0;
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

    seekToElpasedSeconds(sec: number): RenderFrame | null {
        this.elapsedSec = Math.max(0, sec);
        return this.getFrameAtElapsedSeconds(this.elapsedSec);
    }

    getFrameAtElapsedSeconds(elapsedSec: number): RenderFrame | null {
        if (this.ticks.length === 0){
            return null;
        }
        const targetTick = this.startTick + elapsedSec * this.ticksPerSecond;
        const bracket = this.bracketTick(targetTick);
        if (!bracket) {
            return null;
        }
        return this.makeRenderFrame(targetTick, bracket.prev, bracket.next);
    }

    private bracketTick(targetTick: number): { prev: TickSnapshot; next: TickSnapshot } | null {
        const n = this.tickNums.length;
        if (n === 0) return null;
    
        // clamp ends
        if (targetTick <= this.tickNums[0]) {
            const s = this.ticks[0];
            return { prev: s, next: s };
        }
        if (targetTick >= this.tickNums[n - 1]) {
            const s = this.ticks[n - 1];
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
    
        const next = this.ticks[lo];
        const prev = this.ticks[lo - 1];
        return { prev, next };
    }

    private makeRenderFrame(targetTick: number, prev: TickSnapshot, next: TickSnapshot): RenderFrame {
        if (prev.tick === next.tick) {
            // return render players derived from prev snapshot
            const count = prev.players.length;
            const players: RenderPlayer[] = new Array(count);
            
            for (let i = 0; i < count; i++) {
            const p = prev.players[i];
            players[i] = { x: p.x, y: p.y, alive: p.alive, team: p.team };
            }

            return { tick: prev.tick, players };
        }

        const denom = next.tick - prev.tick;
        const alphaRaw = denom > 0 ? (targetTick - prev.tick) / denom : 0;
        const alpha = Math.min(1, Math.max(0, alphaRaw));

        const count = Math.min(prev.players.length, next.players.length);
        const players: RenderPlayer[] = new Array(count);

        for (let i = 0; i < count; i++) {
            const a = prev.players[i];
            const b = next.players[i];

            players[i] = {
            team: a.team,
            alive: a.alive,
            x: a.x + (b.x - a.x) * alpha,
            y: a.y + (b.y - a.y) * alpha,
            };
        }

        return { tick: targetTick, players };
    }

}