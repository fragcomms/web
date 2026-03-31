export type Team = 2 | 3; // team number either 2 or 3 for some reason
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
  sid: SteamID;
};

export type ReplayRoster = Record<string, ReplayRosterEntry>;

// changed from json parsing to tuples
// id, hp, x, y, z, rot
export type TimelinePlayer = [number, number, number, number, number, number]

// changed from json parsing to tuples
// eid, id, wep, x, y, z
export type TimelineGrenade = [number, number, number, number, number, number]

export type TimelineTick = {
  t: number;
  p: TimelinePlayer[];
  // g?: TimelineGrenade[];
};

export type WeaponFireEvent = {
  t: number;
  id: number; // steamid to number because shortened
  wep: string;
};

export type RoundStartEvent = {
  t: number;
  time: string;
};

export type RoundEndEvent = {
  t: number;
  winner?: string;
  reason?: string;
};

export type ReplayEvents = {
  weapon_fire?: WeaponFireEvent[];
  round_start?: RoundStartEvent[];
  round_end?: RoundEndEvent[];
};

export type ReplayJSON = {
  meta: ReplayMeta;
  players: ReplayRoster;
  timeline: TimelineTick[];
  events?: ReplayEvents;
};

export type RenderPlayer = {
  steamid: SteamID;
  x: number;
  y: number;
  rot: number;
  alive: boolean;
  team: Team;
  hp: number;
  name: string;
};

export type RenderTracer = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  life: number;
  team: Team;
};

export type RenderFrame = {
  tick: number;
  players: RenderPlayer[];
  tracers: RenderTracer[];
};

// maybe defunct
export type PlayerState = {
  steamid: SteamID;
  name: string;

  x: number;
  y: number;
  rot: number;

  alive: boolean;
  team: Team;

  // not using rn
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
