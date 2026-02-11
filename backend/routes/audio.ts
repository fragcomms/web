import { Router } from 'express';
import { NodeSSH } from 'node-ssh';
import pool from '../config/db.js';
import { ensureAuth } from '../middleware/authentication.js';
import { DiscordProfile as User } from '../types/user.js';

const router = Router();

// /api/audio
router.get("/", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");
  try {
    const query = `
      SELECT a.audio_id, a.creation_time, a.sampling_rate
      FROM audios a
      JOIN media_access ma ON a.audio_id = ma.audio_id
      LEFT JOIN replays r ON a.audio_id = r.audio_id
      WHERE ma.discord_id = $1 AND r.replay_id IS NULL
      ORDER BY a.creation_time DESC`;
    const result = await pool.query(query, [user.id]);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).send("Database error")
  }
});

// /api/audio/id/stream
router.get("/:id/stream", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");
  const ssh = new NodeSSH();
  try {
    //fetching data from db
    const query = `
      SELECT a.file_path 
      FROM audios a
      JOIN media_access ma ON a.audio_id = ma.audio_id
      WHERE a.audio_id = $1 AND ma.discord_id = $2`;
    const result = await pool.query(query, [req.params.id, user.id]);
    if (result.rows.length === 0) return res.status(404).send("Audio not found");
    
    //fetching binary data from backend machine
    const remotePath = result.rows[0].path;
    await ssh.connect({
      host: process.env.REMOTE_AUDIO_HOST,
      username: process.env.REMOTE_AUDIO_USER,
      password: process.env.REMOTE_AUDIO_PASS,
    });

    const sftp = await ssh.requestSFTP();
    const stream = sftp.createReadStream(remotePath);
    res.setHeader('Content-Type', 'audio/mka');
    stream.pipe(res);

    // clean up when finished
    stream.on('close', () => {
      ssh.dispose();
    })

    // clean up if error
    stream.on('error', (e: Error) => {
      console.error("Stream error:", e)
      ssh.dispose();
    })
    
  } catch (e) {
    console.error(e);
    ssh.dispose(); // make sure ssh is closed
    res.status(500).send("Server Error");
  }
});

// practically same thing as stream
// /api/audio/id/transcription
router.get("/:id/transcription", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");
  const ssh = new NodeSSH();
  try {
    //fetching data from db
    const query = `
      SELECT t.file_path 
      FROM transcripts t
      JOIN media_access ma ON ma.audio_id = t.audio_id
      WHERE t.audio_id = $1 AND ma.discord_id = $2`;
    const result = await pool.query(query, [req.params.id, user.id]);
    if (result.rows.length === 0) return res.status(404).send("Transcript not found");
    
    //fetching binary data from backend machine
    const remotePath = result.rows[0].path;
    await ssh.connect({
      host: process.env.REMOTE_AUDIO_HOST,
      username: process.env.REMOTE_AUDIO_USER,
      password: process.env.REMOTE_AUDIO_PASS,
    });

    const sftp = await ssh.requestSFTP();
    const stream = sftp.createReadStream(remotePath);
    res.setHeader('Content-Type', 'audio/mka');
    stream.pipe(res);

    // clean up when finished
    stream.on('close', () => {
      ssh.dispose();
    })

    // clean up if error
    stream.on('error', (e: Error) => {
      console.error("Stream error:", e)
      ssh.dispose();
    })
    
  } catch (e) {
    console.error(e);
    ssh.dispose(); // make sure ssh is closed
    res.status(500).send("Server Error");
  }
});

//TODO: figure out how to decentralize transcript transport
// and use the server to make a master transcript instead
/**
 * we already have all separated transcripts, just need to
 * think about how to route it accordingly to be fetchable
 * 
 * /api/id/transcription/discordid ?
 * and then there will be multiple records in the database that have a reference to a singular audio_id
 */

export default router;