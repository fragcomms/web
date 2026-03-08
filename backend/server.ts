import pgSession from "connect-pg-simple";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import pool from "./config/db.js";
import audioRoutes from "./routes/audio.js";
import loginRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import replayRoutes from "./routes/replay.js";
import type { UserWithToken as User } from "./types/user.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = 5000;
const pgStore = pgSession(session);

app.use(
  cors({
    origin: ["http://localhost:5173", "https://frags.ayayrom.cfd"],
    credentials: true,
  }),
);
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV == "development" ? false : true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
    store: new pgStore({
      pool: pool,
      tableName: "session",
    }),
  }),
);

// doing passport now
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID!,
      clientSecret: process.env.CLIENT_SECRET!,
      callbackURL: process.env.CALLBACK_URL,
      scope: ["identify", "email", "connections"],
    },
    async (token, _refreshToken, profile, done) => {
      try {
        const timestamp = new Date();
        const query = `
      INSERT INTO public.users (discord_id, created_at, last_accessed, discord_username, avatar)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (discord_id)
      DO UPDATE SET 
        discord_username = EXCLUDED.discord_username, 
        last_accessed = $3,
        avatar = EXCLUDED.avatar
      RETURNING *`;
        const result = await pool.query(query, [
          profile.id,
          timestamp,
          timestamp,
          profile.username,
          profile.avatar,
        ]);

        const user = result.rows[0];
        user.token = token;

        return done(null, user);
      } catch (e) {
        console.error("Discord passport error:", e);
        return done(e, undefined);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  const u = user as User;
  done(null, {
    id: u.discord_id,
    token: u.token,
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
passport.deserializeUser(async (sessionData: any, done) => {
  try {
    const query = `
      SELECT * FROM public.users 
      WHERE discord_id = $1`;
    const result = await pool.query(query, [sessionData.id]);
    if (result.rows.length === 0) return done(null, false);
    const user = result.rows[0];
    user.token = sessionData.token;
    done(null, user);
  } catch (e) {
    console.error("Deserialization error:", e);
    done(e, null);
  }
});

app.get("/api", (_req, res) => res.send("API is up"));
app.use("/api/auth", loginRoutes);
app.use("/api/replays", replayRoutes);
app.use("/api/audio", audioRoutes);
app.use("/api", profileRoutes);

// very niche
app.get("/api/getBotInviteLink", (_req, res) => {
  const CLIENT_ID = process.env.CLIENT_ID;
  const scopes = ["bot", "applications.commands"];
  res.json({
    url: `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=${scopes.join("%20")}&permissions=8`,
  });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
