// user types

// discord profile
export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  global_name?: string;
}

// authenticated user with token
export interface UserWithToken extends DiscordProfile {
  token: string;
}

// player grabbed from replay
export interface ReplayPlayer {
  team: number
  steamid: string
  name?: string
  hp: number
  alive: boolean
}