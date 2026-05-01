import { useMemo } from "react";

export function useWeapon(
  weaponEvents: any[],
  currentTick: number,
  slotToSteamid: Record<number, string>
) {
  const wepGroups = useMemo(() => {
    const wep: Record<number, any[]> = {};
    weaponEvents?.forEach(e => {
      if (!wep[e.id]) wep[e.id] = [];
      wep[e.id].push(e);
    });
    return wep;
  }, [weaponEvents]);

  return useMemo(() => {
    const weapons: Record<string, string> = {};

    Object.entries(slotToSteamid).forEach(([slotStr, steamid]) => {
      const slot = Number(slotStr);
      let weaponName = "";
      
      const userWeps = wepGroups[slot];
      if (userWeps) {
        for (let i = userWeps.length - 1; i >= 0; i--) {
          if (userWeps[i].t <= currentTick) {
            weaponName = userWeps[i].wep;
            break;
          }
        }
      }

      weapons[steamid] = weaponName;
    });

    return weapons;
  }, [currentTick, wepGroups, slotToSteamid]);
}