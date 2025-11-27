import express, {Request, Response, NextFunction} from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";

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


/// temp discord access token
let discAccessToken: string | undefined;

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
            sameSite: "none",
        }
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
        (token, _refreshToken, profile, done) => {
            discAccessToken = token;
            return done(null, profile);
        }
    )
);

type DiscordUser = DiscordProfile;

// serialize user to/fro session
passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((obj: any, done) => done(null, obj));



//routes

//home
app.get("/", (_req: Request, res: Response) => {
    res.send('<a href="/auth/discord">Log in with Discord</a>');
});

//start login
app.get("/auth/discord", passport.authenticate("discord"));

// disc OAth callback 
app.get(
    "/auth/discord/callback",
    passport.authenticate("discord", {failureRedirect: "/"}),
    (_req: Request, res: Response) => {
        res.send(`
            <html>
                <body>
                    <p>Login Successful. You may now safely close this window.</p>
                    <script>
                        window.opener.postMessage({ token: '${discAccessToken}', status: 'Login successful' }, "*");
                        setTimeout(() => window.close(), 3000);
                    </script>
                </body>
            </html>

        `);
    }
);

// fetch user's Discord profile
app.get("/profile", async (_req: Request, res: Response) => {
    if(!discAccessToken) {
        return res.status(400).send("Access token missing");
    }

    try {
        const response = await fetch("https://discord.com/api/v10/users/@me", {
            headers: {Authorization: `Bearer ${discAccessToken}` },
    
        });
        const data = await response.json();
        res.json(data);
    } catch(err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/connections", async (_req: Request, res: Response) => {
    if(!discAccessToken)  {
        return res.status(400).send("Access token missing");
    }

    try {
        const response = await fetch("https://discord.com/api/v10/users/@me/connections", {
            headers: { 
                Authorization: `Bearer ${discAccessToken}` 
            },

        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

//logout
app.post("/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
        discAccessToken = undefined;
        if(err) {
            return next(err);
        }
        res.send({
            status: "Logged out" 
        });
    });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));