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
      "0": { name: "p1", team: 2, sid: "111" },
      "1": { name: "p2", team: 3, sid: "222" },
    },
    timeline: [
      {
        t: 100,
        p: [
          [0, 100, 0, 0, 0, 0],
          [1, 100, 10, 10, 0, 90]
        ],
        g: [
          [99, 0, 2, 100, 200, 10],
        ],
      },
      {
        t: 110,
        p: [
          [0, 100, 10, 0, 0, 0],
          [1, 100, 20, 10, 0, 90]
        ],
        g: [
          [99, 0, 2, 120, 240, 10],
        ],
      },
    ],
    events: {
      weapon_fire: [],
      smokegrenade_detonate: [
        { t: 100, id: 0, x: 300, y: 400, z: 0 },
      ],
      inferno_startburn: [
        { t: 100, id: 7, x: 500, y: 600, z: 0 },
      ],
      inferno_expire: [
        { t: 108, id: 7, x: 500, y: 600, z: 0 },
      ],
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
    expect(frame!.grenades).toHaveLength(1);
    expect(frame!.grenades[0].eid).toBe(99);
    expect(frame!.grenades[0].x).toBe(100);
    expect(frame!.grenades[0].y).toBe(200);
    expect(frame!.areaEffects).toHaveLength(4);
    expect(frame!.areaEffects.slice(0, 3).every((effect) => effect.kind === "smoke")).toBe(true);
    expect(frame!.areaEffects[3].kind).toBe("inferno");
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
    expect(frame!.grenades[0].x).toBe(120);
    expect(frame!.grenades[0].y).toBe(240);
    expect(frame!.areaEffects).toHaveLength(3);
    expect(frame!.areaEffects.every((effect) => effect.kind === "smoke")).toBe(true);
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
    expect(frame!.grenades[0].x).toBeCloseTo(110, 5);
    expect(frame!.grenades[0].y).toBeCloseTo(220, 5);
    expect(frame!.areaEffects).toHaveLength(4);

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
    expect(frame!.grenades[0].grenadeType).toBe(2);
    expect(frame!.areaEffects.map((effect) => effect.kind)).toEqual(["smoke", "smoke", "smoke", "inferno"]);
    expect(frame!.tracers).toEqual([]);
  });
});
