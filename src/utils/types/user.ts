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

