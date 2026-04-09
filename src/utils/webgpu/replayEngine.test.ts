import { beforeEach, describe, expect, it } from "vitest";
import { ReplayEngine } from "./logic/engine/replayEngine";
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
          [77, 0, 1, 150, 250, 0],
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
          [77, 0, 1, 150, 250, 0],
          [99, 0, 2, 120, 240, 10],
        ],
      },
    ],
    events: {
      weapon_fire: [],
      hegrenade_detonate: [
        { t: 100, id: 0, x: 150, y: 250, z: 0 },
      ],
      smokegrenade_detonate: [
        { t: 100, id: 0, x: 300, y: 400, z: 0 },
      ],
      inferno_startburn: [
        { t: 100, id: 7, x: 500, y: 600, z: 0 },
      ],
      inferno_expire: [
        { t: 108, id: 7, x: 500, y: 600, z: 0 },
      ],
      inferno_extinguish: [], // Added this just to perfectly match ReplayJSON type requirements if strict
    },
  };
}

describe("ReplayEngine", () => {
  let rp: ReplayEngine;

  beforeEach(() => {
    rp = new ReplayEngine();
  });

  it("returns null if no replay has been set", () => {
    const frame = rp.getFrameAtElapsedSeconds(0);
    expect(frame).toBeNull();
  });

  it("brackets to first tick if negative elapsed time", () => {
    rp.ticksPerSecond = 10; // MUST be set before setReplay
    rp.setReplay(makeReplay());

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
    expect(frame!.areaEffects).toHaveLength(2);
    expect(frame!.areaEffects.map((effect) => effect.kind)).toEqual(["he", "inferno"]);
    expect(frame!.smokeSources).toHaveLength(1);
    expect(frame!.smokeSources[0].x).toBe(300);
    expect(frame!.smokeSources[0].y).toBe(400);
    expect(frame!.tracers).toEqual([]);
  });

  it("brackets to last tick if elapsed time after end of demo", () => {
    rp.ticksPerSecond = 10;
    rp.setReplay(makeReplay());

    const frame = rp.getFrameAtElapsedSeconds(999);
    expect(frame).not.toBeNull();
    expect(frame!.tick).toBe(110);
    expect(frame!.players[0].x).toBe(10);
    expect(frame!.players[0].y).toBe(0);
    expect(frame!.players[1].x).toBe(20);
    expect(frame!.players[1].y).toBe(10);
    expect(frame!.grenades[0].x).toBe(120);
    expect(frame!.grenades[0].y).toBe(240);
    expect(frame!.areaEffects).toHaveLength(0);
    expect(frame!.smokeSources).toHaveLength(1);
    expect(frame!.tracers).toEqual([]);
  });

  it("interpolates player positions between two ticks", () => {
    rp.ticksPerSecond = 10;
    rp.setReplay(makeReplay());

    const frame = rp.getFrameAtElapsedSeconds(0.5);
    expect(frame).not.toBeNull();

    expect(frame!.players[0].x).toBeCloseTo(5, 5);
    expect(frame!.players[0].y).toBeCloseTo(0, 5);

    expect(frame!.players[1].x).toBeCloseTo(15, 5);
    expect(frame!.players[1].y).toBeCloseTo(10, 5);
    expect(frame!.grenades[0].x).toBeCloseTo(110, 5);
    expect(frame!.grenades[0].y).toBeCloseTo(220, 5);
    expect(frame!.areaEffects).toHaveLength(1);
    expect(frame!.areaEffects[0].kind).toBe("inferno");
    expect(frame!.smokeSources).toHaveLength(1);

    expect(frame!.players[0].steamid).toBe("111");
    expect(frame!.players[1].steamid).toBe("222");
    expect(frame!.tracers).toEqual([]);
  });

  it("returns exact tick info when target tick is non interpolated", () => {
    rp.ticksPerSecond = 10;
    rp.setReplay(makeReplay());

    const frame = rp.getFrameAtElapsedSeconds(0);
    expect(frame).not.toBeNull();
    expect(frame!.tick).toBe(100);
    expect(frame!.players[0].x).toBe(0);
    expect(frame!.players[1].x).toBe(10);
    expect(frame!.players[0].rot).toBe(0);
    expect(frame!.players[1].rot).toBe(90);
    expect(frame!.grenades[0].grenadeType).toBe(2);
    expect(frame!.areaEffects.map((effect) => effect.kind)).toEqual(["he", "inferno"]);
    expect(frame!.smokeSources).toHaveLength(1);
    expect(frame!.tracers).toEqual([]);
  });

  it("hides HE grenade projectiles once the detonation event has happened", () => {
    rp.ticksPerSecond = 10;
    rp.setReplay(makeReplay());

    const frame = rp.getFrameAtElapsedSeconds(0);
    expect(frame).not.toBeNull();
    expect(frame!.grenades.map((grenade) => grenade.grenadeType)).toEqual([2]);
  });
});