export type Team = 2 | 3; //team number either 2 or 3 for some reason
export type SteamID = string;

export type ReplayMeta = {
    filename: string;
    map: string;
    interval: number;
    length_ticks: number;
    winner_team: Team;
    winner_name: string;
    won_by_team_that_started_as: string;
    score_t: number;
    score_ct: number;
    final_score: string;
};

export type ReplayRosterEntry = {
    name: string;
    team: Team;
};

export type ReplayRoster = Record<SteamID, ReplayRosterEntry>;

export type TimelinePlayer = {
    sid: number;
    hp: number;
    x: number;
    y: number;
    rot: number;
    p: number;
};

export type TimelineTick = {
    tick: number;
    p: TimelinePlayer[];
};

export type ReplayJSON = {
    meta: ReplayMeta;
    players: ReplayRoster;
    timeline: TimelineTick[];
};

export type RenderPlayer = {
    steamid: SteamID;
    x: number;
    y: number;
    rot: number;
    alive: boolean;
    team: Team;
}

export type RenderFrame = {
    tick: number;
    players: RenderPlayer[];
};

//maybe defunct
export type PlayerState = {
    steamid: SteamID; 
    name: string;

    x: number;
    y: number;
    rot: number;

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

