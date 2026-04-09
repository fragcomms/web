import type { TimelineTick, TimelinePlayer, ReplayJSON, RoundChunk } from "../../types";

export const Parser = {
  safeExtract<T extends { t: number }>(arr?: T[]): T[] {
    return (arr ?? []).slice().sort((a, b) => a.t - b.t);
  },

  patchMissingTimelinePlayers(timeline: TimelineTick[]): TimelineTick[] {
    const lastKnownState = new Map<number, TimelinePlayer>();
    
    for (const t of timeline) {
      for (const p of t.p) {
        lastKnownState.set(p[0], p);
      }
      if (t.p.length < lastKnownState.size) {
        const currentSids = new Set(t.p.map((p) => p[0]));
        for (const [sid, p] of lastKnownState.entries()) {
          if (!currentSids.has(sid)) {
            t.p.push([...p] as TimelinePlayer);
          }
        }
      }
    }
    return timeline;
  },

  sliceIntoRounds(data: ReplayJSON): RoundChunk[] {
    const chunks: RoundChunk[] = [];
    const totalTicks = data.timeline.length;
    if (totalTicks === 0) return chunks;
    
    const safeEvents = {
      weapon_fire: this.safeExtract(data.events?.weapon_fire),
      hegrenade_detonate: this.safeExtract(data.events?.hegrenade_detonate),
      smokegrenade_detonate: this.safeExtract(data.events?.smokegrenade_detonate),
      inferno_startburn: this.safeExtract(data.events?.inferno_startburn),
      inferno_expire: this.safeExtract(data.events?.inferno_expire),
      inferno_extinguish: this.safeExtract(data.events?.inferno_extinguish),
      player_death: this.safeExtract(data.events?.player_death),
    };

    const roundStarts = data.events?.round_start ?? [];
    const firstDemoTick = data.timeline[0].t;
    const finalDemoTick = data.timeline[totalTicks - 1].t;

    if (roundStarts.length > 0 && roundStarts[0].t > firstDemoTick) {
      chunks.push(this.buildChunk(data, safeEvents, 0, firstDemoTick, roundStarts[0].t - 1));
    } else if (roundStarts.length === 0) {
      chunks.push(this.buildChunk(data, safeEvents, 1, firstDemoTick, finalDemoTick));
      return chunks;
    }

    for (let i = 0; i < roundStarts.length; i++) {
      const startTick = roundStarts[i].t;
      const endTick = roundStarts[i + 1] ? roundStarts[i + 1].t - 1 : finalDemoTick;
      chunks.push(this.buildChunk(data, safeEvents, i + 1, startTick, endTick));
    }

    return chunks;
  },

  buildChunk(data: ReplayJSON, safeEvents: any, roundNum: number, startTick: number, endTick: number): RoundChunk {
    const tlStart = this.findIndexForTick(data.timeline, startTick);
    const tlEnd = this.findIndexForTick(data.timeline, endTick);
    
    const filterEvents = <T extends { t: number }>(events: T[] = []) => 
      events.filter(e => e.t >= startTick && e.t <= endTick);

    return {
      roundNum,
      startTick,
      endTick,
      timeline: this.patchMissingTimelinePlayers(data.timeline.slice(tlStart, tlEnd + 1)),
      events: {
        weapon_fire: filterEvents(safeEvents.weapon_fire),
        hegrenade_detonate: filterEvents(safeEvents.hegrenade_detonate),
        smokegrenade_detonate: filterEvents(safeEvents.smokegrenade_detonate),
        inferno_startburn: filterEvents(safeEvents.inferno_startburn),
        inferno_expire: filterEvents(safeEvents.inferno_expire),
        inferno_extinguish: filterEvents(safeEvents.inferno_extinguish),
        player_death: filterEvents(safeEvents.player_death),
      }
    };
  },

  findIndexForTick(arr: { t: number }[], target: number): number {
    let lo = 0, hi = arr.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].t < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
};