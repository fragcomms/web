export interface DiscordProfile {
  discord_id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  global_name?: string;
}

export interface UserWithToken extends DiscordProfile {
  token: string;
}
