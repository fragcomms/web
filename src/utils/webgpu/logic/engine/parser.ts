import type { TimelineTick, TimelinePlayer } from "../../types";

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
  }
};