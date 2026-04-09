import type { SteamID, Team } from "../../types";

export type RosterInfo = { steamid: SteamID; team: Team; name: string; };

export class PlayerManager {
  private rosterBySid = new Map<number, RosterInfo>();

  init(playersData?: Record<string, any>) {
    this.rosterBySid.clear();
    if (!playersData) return;

    for (const [tinyIdStr, info] of Object.entries(playersData)) {
      const sidNum = Number(tinyIdStr);
      if (Number.isFinite(sidNum)) {
        this.rosterBySid.set(sidNum, { 
          steamid: info.sid, 
          team: info.team, 
          name: info.name 
        });
      }
    }
  }

  getInfo(sid: number): RosterInfo | undefined {
    return this.rosterBySid.get(sid);
  }

  clear() {
    this.rosterBySid.clear();
  }
}