import getKDA from "./KDAStats";
import type { PlayerDeathEvent } from "../../../utils/webgpu/types";
import { useMemo } from "react";

export function useKDA(
  deathEvents: PlayerDeathEvent[],
  slotToSteamid: Record<number, string>,
  currentTimeSec: number,
  replayStartTick: number,
  ticksPerSecond: number
) {
  return useMemo(() => {
    const filtered = deathEvents.filter(e => {
      const sec = (e.t - replayStartTick) / ticksPerSecond;
      return sec <= currentTimeSec;
    });

    const remapped = filtered.map(e => ({
      ...e,
      att: e.att !== undefined && e.att >= 0 ? slotToSteamid[e.att] : undefined,
      vic: e.vic !== undefined && e.vic >= 0 ? slotToSteamid[e.vic] : undefined,
      ass: e.ass !== undefined && e.ass >= 0 ? slotToSteamid[e.ass] : undefined,
    }));

    return getKDA(remapped);
  }, [deathEvents, slotToSteamid, currentTimeSec, replayStartTick, ticksPerSecond]);
}