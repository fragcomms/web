import { spawn } from "child_process";
import { Router } from "express";
import pool from "../config/db.js";
import { ensureAuth } from "../middleware/authentication.js";
import { DiscordProfile as User } from "../types/user.js";

const router = Router();
const REPLAY_PIPELINE_URL = "http://" + process.env.REMOTE_HOST + ":" + process.env.REMOTE_PORT;

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
    const result = await pool.query(query, [user.discord_id]);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).send("Database error");
  }
});

// /api/audio/id/track/identifier
router.get("/:id/track/:identifier", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");

  try {
    const query = `
      SELECT a.file_path
      FROM audios a
      JOIN media_access ma ON a.audio_id = ma.audio_id
      WHERE a.audio_id = $1 AND ma.discord_id = $2
    `;
    const result = await pool.query(query, [req.params.id, user.discord_id]);

    if (result.rows.length === 0) return res.status(404).send("Audio not found");

    const remotePath = result.rows[0].file_path;
    const remoteAudioUrl = `${REPLAY_PIPELINE_URL}/get_audio?filepath=${encodeURIComponent(remotePath)}`;
    const identifier = req.params.identifier;

    // instead of mka, we use webm for serving it to users
    // because webm is more compatible than mka for websites
    res.setHeader("Content-Type", "audio/webm");

    const ffmpeg = spawn("ffmpeg", [
      "-i",
      remoteAudioUrl,
      "-map",
      `0:m:title:${identifier}`,
      "-c:a",
      "libopus",
      "-b:a",
      "96k",
      "-f",
      "webm",
      "pipe:1",
    ]);

    ffmpeg.stdout.pipe(res);

    req.on("close", () => {
      ffmpeg.kill("SIGKILL");
    });
  } catch (e) {
    console.error("Audio track extraction error: ", e);
    res.status(500).send("Server error");
  }
});

// /api/audio/:id/track/:identifier/download
router.get("/:id/track/:identifier/download", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");

  try {
    const query = `
      SELECT a.file_path
      FROM audios a
      JOIN media_access ma ON a.audio_id = ma.audio_id
      WHERE a.audio_id = $1 AND ma.discord_id = $2
    `;
    const result = await pool.query(query, [req.params.id, user.discord_id]);

    if (result.rows.length === 0) return res.status(404).send("Audio not found");

    const remotePath = result.rows[0].file_path;
    const identifier = req.params.identifier;

    const remoteAudioUrl = `${REPLAY_PIPELINE_URL}/get_audio?filepath=${encodeURIComponent(remotePath)}`;

    res.setHeader("Content-Type", "audio/x-matroska");
    res.setHeader("Content-Disposition", `attachment; filename="${identifier}.mka"`);

    const ffmpeg = spawn("ffmpeg", [
      "-i", remoteAudioUrl,
      "-map", `0:m:title:${identifier}`,
      "-c:a", "copy",  // no transcode, just remux the raw PCM track
      "-f", "matroska",
      "pipe:1",
    ]);

    ffmpeg.stdout.pipe(res);

    req.on("close", () => {
      ffmpeg.kill("SIGKILL");
    });
  } catch (e) {
    console.error("Audio download error: ", e);
    res.status(500).send("Server error");
  }
});

// // /api/audio/id/stream
// router.get("/:id/stream", ensureAuth, async (req, res) => {
//   const user = req.user as User;
//   if (!user) return res.status(401).send("Unauthorized");

//   try {
//     // fetching data from db
//     const query = `
//       SELECT a.file_path
//       FROM audios a
//       JOIN media_access ma ON a.audio_id = ma.audio_id
//       WHERE a.audio_id = $1 AND ma.discord_id = $2`;
//     const result = await pool.query(query, [req.params.id, user.discord_id]);
//     if (result.rows.length === 0) return res.status(404).send("Audio not found");

//     // fetching binary data from backend machine
//     const remotePath = result.rows[0].file_path;
//     const remoteResponse = await fetch(`${REPLAY_PIPELINE_URL}/get_audio?filepath=${encodeURIComponent(remotePath)}`);

//     if (!remoteResponse.ok || !remoteResponse.body) {
//       console.error("FastAPI Error:", await remoteResponse.text());
//       return res.status(remoteResponse.status).send("Failed to stream audio from processing server");
//     }

//     res.setHeader("Content-Type", "audio/mka");
//     Readable.fromWeb(remoteResponse.body as any).pipe(res);
//   } catch (e) {
//     console.error("Audio stream error: ", e);
//     res.status(500).send("Server Error");
//   }
// });

// the implementation of doing multiple requests for transcripts
// and merging it into a master transcript
// /api/audio/:id/transcriptions
router.get("/:id/transcriptions", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");

  try {
    const query = `
      SELECT t.file_path
      FROM transcripts t
      JOIN media_access ma ON ma.audio_id = t.audio_id
      WHERE t.audio_id = $1 AND ma.discord_id = $2
    `;

    const result = await pool.query(query, [req.params.id, user.discord_id]);

    if (result.rows.length === 0) return res.json({});

    const fetchPromises = result.rows.map(async (row) => {
      const remoteResponse = await fetch(
        `${REPLAY_PIPELINE_URL}/get_transcript?filepath=${encodeURIComponent(row.file_path)}`,
      );

      if (!remoteResponse.ok) {
        console.error(`Failed to fetch transcript: ${row.file_path}`);
        return null;
      }

      return await remoteResponse.json();
    });

    const yoinkedTranscripts = await Promise.all(fetchPromises);

    const masterTranscript: Record<string, any> = {};

    // combining it all into a master transcript for easier manipulation
    for (const item of yoinkedTranscripts) {
      if (item && item.discord_id) {
        masterTranscript[item.discord_id] = item.segments;
      }
    }

    res.json(masterTranscript);
  } catch (e) {
    console.log(e);
  }
});

// /api/audio/id/transcription/discordid
// router.get("/:id/transcription/:discordid")

// TODO: figure out how to decentralize transcript transport
// and use the server to make a master transcript instead
/**
 * we already have all separated transcripts, just need to
 * think about how to route it accordingly to be fetchable
 *
 * /api/audio/id/transcription/discordid ?
 * and then there will be multiple records in the database that have a reference to a singular audio_id
 */
/* UPDATE: transcriptions will now be in json to make easy access to fields
the backend_scripts will NOT compile a master transcript because we want to
stream the json, and when the user doesn't want this person's transcript,
we will stop feeding it to the client and thus allowing us to effectively
stop giving the user this person's transcript, making it easier for us.
*/
/*
ALTERNATIVE: what about giving it all to the user immediately instead of streaming? would be more simpler than the initial approach
*/

export default router;
