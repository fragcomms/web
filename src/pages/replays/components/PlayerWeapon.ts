import { useMemo } from "react";

function normalizeWeaponName(name: string): string {
  if (name === "knife_t") return "Knife";
  if (name === "knife") return "Knife";
  if (name === "High Explosive Grenade") return "HE Grenade";
  return name;
}

interface WeaponEvent {
  id: number;
  t: number;
  wep: string;
}

function findWeaponAtTick(events: WeaponEvent[], tick: number): string {
  let left = 0;
  let right = events.length - 1;
  let resultIndex = -1;

  while (left <= right) {
    const mid = (left + right) >> 1;
    if (events[mid].t <= tick) {
      resultIndex = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return resultIndex >= 0 ? events[resultIndex].wep : "";
}

export function useWeapon(
  weaponEvents: WeaponEvent[],
  currentTick: number,
  slotToSteamid: Record<number, string>
) {
  const wepGroups = useMemo(() => {
    const wep: Record<number, WeaponEvent[]> = {};
    weaponEvents?.forEach(e => {
      if (!wep[e.id]) wep[e.id] = [];
      wep[e.id].push(e);
    });
    Object.values(wep).forEach(events => {
      events.sort((a, b) => a.t - b.t);
    });
    return wep;
  }, [weaponEvents]);

  return useMemo(() => {
    const weapons: Record<string, string> = {};

    Object.entries(slotToSteamid).forEach(([slotStr, steamid]) => {
      const slot = Number(slotStr);
      const userWeps = wepGroups[slot];
      const weaponName = userWeps ? findWeaponAtTick(userWeps, currentTick) : "";

      weapons[steamid] = normalizeWeaponName(weaponName);
    });

    return weapons;
  }, [currentTick, wepGroups, slotToSteamid]);
}