export type Team = 2 | 3; //team number either 2 or 3 for some reason

export type SteamID = string;

export type PlayerState = {
    steamid: SteamID; 
    name: string;

    x: number;
    y: number;

    alive: boolean;
    team: Team;

    //not using rn
    value: number;
    spent: number;
    score: number;
};

export type TickSnapshot = {
    tick: number;
    players: PlayerState[];
};

export type ShotEvent = {
    tick: number;
    game_time: number;
    user_steamid: SteamID;
    user_name: string;
    weapon: string;
    silenced: boolean;
};

export type HitEvent = {
    tick: number;
    game_time: number;

    attacker_steamid: SteamID;
    attacker_name: string;

    user_steamid: SteamID;
    user_name: string;

    weapon: string;
    hitgroup: number;

    dmg_health: number;
    dmg_armor: number;

    health: number;
    armor: number;   
};

export type FlashEvent = {
  tick: number;
  game_time: number;

  attacker_steamid: SteamID;
  attacker_name: string;

  user_steamid: SteamID;
  user_name: string;

  blind_duration: number;
  entityid: number;
};

export type ReplayJSON = {
  ticks: TickSnapshot[];
  shots: ShotEvent[];
  hits: HitEvent[];
  flashes: FlashEvent[];
};

export type RenderPlayer = {
    x: number;
    y: number;
    alive: boolean;
    team: Team;
}

export type RenderFrame = {
    tick: number;
    players: RenderPlayer[];
};