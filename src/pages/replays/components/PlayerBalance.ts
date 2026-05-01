import { useMemo } from "react";

export function useBalance(
  balanceEvents: any[],
  currentTick: number,
  slotToSteamid: Record<number, string>
) {
  const balGroups = useMemo(() => {
    const bal: Record<number, any[]> = {};
    balanceEvents?.forEach(e => {
      if (!bal[e.id]) bal[e.id] = [];
      bal[e.id].push(e);
    });
    return bal;
  }, [balanceEvents]);

  return useMemo(() => {
    const economy: Record<string, number> = {};

    Object.entries(slotToSteamid).forEach(([slotStr, steamid]) => {
      const slot = Number(slotStr);
      let money = 0;
      
      const userBals = balGroups[slot];
      if (userBals) {
        for (let i = userBals.length - 1; i >= 0; i--) {
          if (userBals[i].t <= currentTick) {
            money = userBals[i].bal;
            break;
          }
        }
      }

      economy[steamid] = money;
    });

    return economy;
  }, [currentTick, balGroups, slotToSteamid]);
}