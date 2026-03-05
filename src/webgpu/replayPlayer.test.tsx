import { describe, it, expect, beforeEach } from "vitest";
import { ReplayPlayer } from "./replayPlayer"; 
import type { ReplayJSON } from "./types";

function makeReplay(): ReplayJSON{
    return {
        ticks: [
            {
                tick: 100,
                players: [
                    { x: 0, y: 0, alive: true, team: 2},
                    { x: 10, y: 10, alive: false, team: 3},
                ],
            },
            {
                tick: 110,
                players: [
                    { x: 10, y: 0, alive: true, team: 2},
                    { x: 20, y: 10, alive: false, team: 3},
                ],
            },
        ],
    } as any;
}

describe("ReplayPlayer", () => {
    let rp: ReplayPlayer;

    beforeEach(() => {
        rp = new ReplayPlayer();
    });

    //Test #1 - Empty Replay
    it("returns null if no replay has been set", () => {
        const frame = rp.getFrameAtElapsedSeconds(0);
        expect(frame).toBeNull();
    });

    // Test #2 - Clamp Before Start
    it("brackets to first tick if negative elapsed time", () => {
        rp.setReplay(makeReplay());
        rp.ticksPerSecond = 10; //is 64 in actuality

        const frame = rp.getFrameAtElapsedSeconds(-1);
        expect(frame).not.toBeNull();
        expect(frame!.tick).toBe(100);
        expect(frame!.players[0].x).toBe(0);
        expect(frame!.players[0].y).toBe(0);
    });

    //Test #3 - Clamp After End
    it("brackets to last tick if elapsed time after end of demo", () => {
        rp.setReplay(makeReplay());
        rp.ticksPerSecond = 10;

        const frame = rp.getFrameAtElapsedSeconds(999);
        expect(frame).not.toBeNull();
        expect(frame!.players[0].x).toBe(10);
        expect(frame!.players[0].y).toBe(0);
    });

    //Test #4 - Frame interpolation
    it("interpolates player positions between two ticks", () => {
        rp.setReplay(makeReplay());
        rp.ticksPerSecond = 10;

        const frame = rp.getFrameAtElapsedSeconds(0.5);
        expect(frame).not.toBeNull();

        // Player 0 should be between 0,0 and 10,0
        expect(frame!.players[0].x).toBeCloseTo(5, 5);
        expect(frame!.players[0].y).toBeCloseTo(0, 5);

        // Player 1 should be between 10,10 and 20,10
        expect(frame!.players[1].x).toBeCloseTo(15, 5);
        expect(frame!.players[1].y).toBeCloseTo(10, 5);        
    });

    //Test #5 - Exact tick display
    it("returns exact tick info when target tick is non interpolated", () => {
        rp.setReplay(makeReplay());
        rp.ticksPerSecond = 10;

        const frame = rp.getFrameAtElapsedSeconds(0);
        expect(frame).not.toBeNull();
        expect(frame!.tick).toBe(100);
        expect(frame!.players[0].x).toBe(0);
        expect(frame!.players[1].x).toBe(10);
    });
});