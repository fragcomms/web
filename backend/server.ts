import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";
import { Pool as PGPool } from 'pg'
import pgSession from 'connect-pg-simple'
import { error } from "console";

dotenv.config();

//DiscordProfile 
type DiscordProfile = {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  global_name?: string;
};

interface UserWithToken extends DiscordProfile {
  token: string;
}

const pgStore = pgSession(session);

const pool = new PGPool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DB,
  password: process.env.PG_PASS,
  port: Number(process.env.PG_PORT),
})

const app = express();
const PORT = 5000;

// dotenv
const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const SESSION_SECRET = process.env.SESSION_SECRET!;
const CALLBACK_URL = process.env.CALLBACK_URL;

//enrsure dotenv variables exist
if (!CLIENT_ID || !CLIENT_SECRET || !SESSION_SECRET) {
  throw new Error("Missing one or more of the following environment variable:\nCLIENT_ID\nCLIENT_SECRET\nSESSION_SECRET");

}
//TODO: expand


// temp discord access token
// let discAccessToken: string | undefined;

// CORS for frontend-backend connection
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// session middleware
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    },
    store: new pgStore({
      pool: pool,
      tableName: 'session',
    })
  })
);

app.use(passport.initialize());
app.use(passport.session());


passport.use(
  new DiscordStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      scope: ["identify", "email", "connections"],

    },
    async (token, _refreshToken, profile, done) => {
      try {
        const timestamp = new Date() // consistent timestamping if it is a new user
        const result = await pool.query(
          `INSERT INTO public.users (discord_id, created_at, last_accessed, discord_username) 
          VALUES ($1, $2, $3, $4) 
          ON CONFLICT (discord_id) 
          DO UPDATE SET 
            discord_username = EXCLUDED.discord_username,
            last_accessed = $3 
          RETURNING *`, //last accessed is $3 because consistency
          [profile.id, timestamp, timestamp, profile.username]
        )
        const user = result.rows[0]
        user.token = token
        
        return done(null, user)
      } catch (e) {
        console.error("Database login err:", e)
        return done(e, undefined)
      }
    }
  )
);

// serialize user to/from session
passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((obj: any, done) => done(null, obj));

//routes

//home
app.get("/", (_req: Request, res: Response) => {
  res.send('<a href="/auth/discord">Log in with Discord</a>');
});

//start login
app.get("/auth/discord", passport.authenticate("discord"));

// disc OAuth callback 
app.get("/auth/discord/callback", passport.authenticate("discord", { failureRedirect: "/" }), (req: Request, res: Response) => {
  const user = req.user as UserWithToken;
  res.send(`
      <html>
          <body>
              <p>Login Successful. The window will now close in 5 seconds.</p>
              <script>
                  window.opener.postMessage({ token: '${user.token}', status: 'Login successful' }, "*");
                  setTimeout(() => window.close(), 5000);
              </script>
          </body>
      </html>

  `);
}
);



// fetch user's Discord profile
app.get("/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).send("Access token missing");
  }

  const user = req.user as UserWithToken;

  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${user.token}` },

    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/connections", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).send("Access token missing");
  }

  const user = req.user as UserWithToken;

  try {
    const response = await fetch("https://discord.com/api/v10/users/@me/connections", {
      headers: {
        Authorization: `Bearer ${user.token}`
      },

    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/replays", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const pythonResponse = await fetch("http://localhost:8000/api/replays")

    if (!pythonResponse.ok) {
      throw new Error(`Python API Error: ${pythonResponse.statusText}`);
    }

    const data = await pythonResponse.json()
    res.json(data)
  } catch (e) {
    console.error("Python service error:", e)
    res.status(500).send("Internal server error.")
  }
})

app.get("/api/audio", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const pythonResponse = await fetch("http://localhost:8000/api/audio")

    if (!pythonResponse.ok) {
      throw new Error(`Python API Error: ${pythonResponse.statusText}`);
    }

    const data = await pythonResponse.json()
    res.json(data)
  } catch (e) {
    console.error("Python service error:", e)
    res.status(500).send("Internal server error.")
  }
})

//logout
app.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as UserWithToken;
  req.logout((err) => {
    user.token = "";
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err)
      }
      res.clearCookie('connect.sid')
      res.send({ status: "Logged out" })
    })
  });
});

app.post("/api/replays", express.json(), async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const pythonResponse = await fetch("http://localhost:8000/api/replays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body), // Pass the data along
    });

    if (!pythonResponse.ok) {
        const errorText = await pythonResponse.text();
        // Parse the error JSON if possible, otherwise use text
        try {
            const errorJson = JSON.parse(errorText);
            return res.status(pythonResponse.status).json(errorJson);
        } catch {
             throw new Error(`Python API Error: ${errorText}`);
        }
    }

    const data = await pythonResponse.json();
    res.json(data);
  } catch (err: any) {
    console.error("Error creating replay:", err);
    res.status(500).send({ detail: err.message || "Internal Server Error" });
  }
});

app.get("/api/replays/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    try {
        const pyRes = await fetch(`http://localhost:8000/api/replays/${req.params.id}`);
        if (!pyRes.ok) throw new Error("Failed to fetch from Python");
        const data = await pyRes.json();
        res.json(data);
    } catch (e) {
        res.status(500).send("Error fetching details");
    }
});

app.get("/api/audio/stream/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
        // We use node-fetch to get the stream from Python
        const pyRes = await fetch(`http://localhost:8000/api/audio/${req.params.id}/stream`);
        
        if (!pyRes.ok || !pyRes.body) {
            return res.status(404).send("Audio not found");
        }

        // Pipe the python stream directly to the browser
        pyRes.body.pipe(res); 
        
    } catch (e) {
        console.error("Stream error:", e);
        res.status(500).send("Error streaming file");
    }
});

//get inv link
app.get("/api/getBotInviteLink", (_req, res) => {
  const CLIENT_ID = process.env.CLIENT_ID;
  if (!CLIENT_ID) return res.status(500).json({ error: "Missing CLIENT_ID" });

  const scopes = ["bot", "applications.commands"];
  const permissions = "8";
  const inviteLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=${scopes.join(
    "%20"
  )}&permissions=${permissions}`;

  res.json({ url: inviteLink });
});



app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));