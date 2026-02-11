import { Router } from 'express';
import pool from '../config/db.js';
import { ensureAuth } from '../middleware/authentication.js'
import { DiscordProfile as User } from '../types/user.js';

const router = Router();

// /api/replay
router.get("/", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");
  try {
    const query = `
      SELECT r.replay_id, r.name, d.fetch_time
      FROM replays r
      JOIN demos d ON d.demo_id = r.demo_id
      JOIN media_access ma ON r.audio_id = ma.audio_id
      WHERE ma.discord_id = $1
      ORDER BY d.fetch_time DESC`;
    
    const result = await pool.query(query, [user.id]);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).send("Database error");
  }
});

// /api/replay/id
router.get("/:id", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");
  try {
    const query = `
      SELECT r.replay_id, r.name, d.fetch_time, d.file_path
      FROM replays r
      JOIN demos d ON d.demo_id = r.demo_id
      JOIN media_access ma ON ma.audio_id = r.audio_id
      WHERE r.replay_id = $1 AND ma.discord_id = $2`;

    const result = await pool.query(query, [req.params.id, user.id]);
    if (result.rows.length === 0) return res.status(404).send("Replay not found");
    res.json(result.rows[0]); // 1 for now
  } catch (e) {
    console.error(e);
    res.status(500).send("Database error");
  }
});

//TODO: allow user to create a replay

export default router;