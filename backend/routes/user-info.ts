import { Router } from "express";
import fetch from "node-fetch";
import { ensureAuth } from "../middleware/authentication.js";
import { UserWithToken as User } from "../types/user.js";
import pool from "../config/db.js";

const router = Router();

// /api/user/profile
router.get("/profile", ensureAuth, async (req, res) => {
  const user = req.user as User;
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error fetching profile");
  }
});

// /api/user/connections
router.get("/connections", ensureAuth, async (req, res) => {
  const user = req.user as User;
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me/connections", {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error fetching profile");
  }
});

// /api/user/id
router.get("/:id", ensureAuth, async (req, res) => {
  const discordId = req.params.id;

  try {
    const dbResult = await pool.query(`
      SELECT discord_username
      FROM users
      WHERE discord_id = $1
      `
    , [discordId])

    if (dbResult.rows.length > 0) {
      return res.json({
        username: dbResult.rows[0].discord_username,
        source: "database"
      })
    }

    const discordRes = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
      }
    })
    if (!discordRes.ok) {
      if (discordRes.status === 404) return res.status(404).send("Unknown User");
      throw new Error(`Discord API error: ${discordRes.statusText}`)
    }
    const discordUser = (await discordRes.json() as {
      id: string,
      username: string;
    });

    await pool.query(`
      INSERT INTO users (discord_id, created_at, discord_username)
      VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
      `, [discordUser.id, Date.now(), discordUser.username])

    res.json({
      username: discordUser.username,
      source: "discord_api"
    })
    
  } catch (e) {
    console.error(`Failed to resolve Discord ID ${discordId}`, e)
    res.status(500).send("Server error")
  }
})

export default router;
