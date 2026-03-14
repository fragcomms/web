import { beforeEach, describe, expect, it } from "vitest";
import { ReplayPlayer } from "./replayPlayer";
import type { ReplayJSON } from "./types";

function makeReplay(): ReplayJSON {
  return {
    meta: {
      filename: "test.dem",
      map: "de_mirage",
      interval: 10,
      length_ticks: 110,
      winner_team: 2,
      winner_name: "2",
      won_by_team_that_started_as: "TeamStartedT",
      score_t: 13,
      score_ct: 11,
      final_score: "13:11",
    },
    players: {
      "111": { name: "p1", team: 2, sid: "76561198000000001" },
      "222": { name: "p2", team: 3, sid: "76561198000000002" },
    },
    timeline: [
      {
        t: 100,
        p: [
          [0, 100, -1000, 500, 0, 90],
          [1, 100, 2000,  800, 0, 180]
        ],
      },
      {
        t: 110,
        p: [
          [0, 100, -1000, 500, 0, 90],
          [1, 100, 2000,  800, 0, 180]
        ],
      },
    ],
    events: {
      weapon_fire: [],
    },
  };
}

describe("ReplayPlayer", () => {
  let rp: ReplayPlayer;

  beforeEach(() => {
    rp = new ReplayPlayer();
  });

  it("returns null if no replay has been set", () => {
    const frame = rp.getFrameAtElapsedSeconds(0);
    expect(frame).toBeNull();
  });

  it("brackets to first tick if negative elapsed time", () => {
    rp.setReplay(makeReplay());
    rp.ticksPerSecond = 10;

    const frame = rp.getFrameAtElapsedSeconds(-1);
    expect(frame).not.toBeNull();
    expect(frame!.tick).toBe(100);
    expect(frame!.players[0].x).toBe(0);
    expect(frame!.players[0].y).toBe(0);
    expect(frame!.players[0].steamid).toBe("111");
    expect(frame!.players[0].team).toBe(2);
    expect(frame!.players[0].alive).toBe(true);
    expect(frame!.tracers).toEqual([]);
  });

  it("brackets to last tick if elapsed time after end of demo", () => {
    rp.setReplay(makeReplay());
    rp.ticksPerSecond = 10;

    const frame = rp.getFrameAtElapsedSeconds(999);
    expect(frame).not.toBeNull();
    expect(frame!.tick).toBe(110);
    expect(frame!.players[0].x).toBe(10);
    expect(frame!.players[0].y).toBe(0);
    expect(frame!.players[1].x).toBe(20);
    expect(frame!.players[1].y).toBe(10);
    expect(frame!.tracers).toEqual([]);
  });

  it("interpolates player positions between two ticks", () => {
    rp.setReplay(makeReplay());
    rp.ticksPerSecond = 10;

    const frame = rp.getFrameAtElapsedSeconds(0.5);
    expect(frame).not.toBeNull();

    expect(frame!.players[0].x).toBeCloseTo(5, 5);
    expect(frame!.players[0].y).toBeCloseTo(0, 5);

    expect(frame!.players[1].x).toBeCloseTo(15, 5);
    expect(frame!.players[1].y).toBeCloseTo(10, 5);

    expect(frame!.players[0].steamid).toBe("111");
    expect(frame!.players[1].steamid).toBe("222");
    expect(frame!.tracers).toEqual([]);
  });

  it("returns exact tick info when target tick is non interpolated", () => {
    rp.setReplay(makeReplay());
    rp.ticksPerSecond = 10;

    const frame = rp.getFrameAtElapsedSeconds(0);
    expect(frame).not.toBeNull();
    expect(frame!.tick).toBe(100);
    expect(frame!.players[0].x).toBe(0);
    expect(frame!.players[1].x).toBe(10);
    expect(frame!.players[0].rot).toBe(0);
    expect(frame!.players[1].rot).toBe(90);
    expect(frame!.tracers).toEqual([]);
  });
});
