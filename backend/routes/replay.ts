import { Router } from "express";
import pool from "../config/db.js";
import { ensureAuth } from "../middleware/authentication.js";
import { DiscordProfile as User } from "../types/user.js";
import { validateSharecode } from "../utils/sharecode.js";
// import { pipeline } from "stream";

const router = Router();
const REPLAY_PIPELINE_URL = "http://" + process.env.REMOTE_HOST + ":" + process.env.REMOTE_PORT;

// /api/replays
router.get("/", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");
  try {
    const query = `
      SELECT
        r.replay_id,
        r.name,
        d.map,
        d.length_ticks,
        d.score_t,
        d.score_ct,
        COALESCE(linked.linked_recording_users, ARRAY[]::text[]) AS linked_recording_users
      FROM replays r
      LEFT JOIN demos d ON d.demo_id = r.demo_id
      LEFT JOIN LATERAL (
        SELECT
          array_agg(
            DISTINCT COALESCE(u.discord_username, ma.discord_id)
            ORDER BY COALESCE(u.discord_username, ma.discord_id)
          ) AS linked_recording_users
        FROM media_access ma
        LEFT JOIN users u ON u.discord_id::text = ma.discord_id::text
        WHERE ma.audio_id = r.audio_id
      ) linked ON TRUE
      WHERE EXISTS (
        SELECT 1
        FROM media_access ma
        WHERE ma.audio_id = r.audio_id AND ma.discord_id = $1
      )
      ORDER BY r.replay_id DESC`;

    const result = await pool.query(query, [user.discord_id]);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).send("Database error");
  }
});

// /api/replays/id
router.get("/:id", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");
  try {
    const query = `
      SELECT r.replay_id, r.name, d.fetch_time, d.file_path, r.audio_id, r.audio_offset, r.audio_starts_first
      FROM replays r
      JOIN demos d ON d.demo_id = r.demo_id
      JOIN media_access ma ON ma.audio_id = r.audio_id
      WHERE r.replay_id = $1 AND ma.discord_id = $2`;

    const result = await pool.query(query, [req.params.id, user.discord_id]);
    if (result.rows.length === 0) return res.status(404).send("Replay not found");
    res.json(result.rows[0]); // 1 for now
  } catch (e) {
    console.error(e);
    res.status(500).send("Database error");
  }
});

// /api/replays/:id/json
router.get("/:id/json", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");
  try {
    const query = `
      SELECT d.file_path
      FROM replays r
      JOIN demos d ON d.demo_id = r.demo_id
      JOIN media_access ma ON ma.audio_id = r.audio_id
      WHERE r.replay_id = $1  AND ma.discord_id = $2
      `;

    const result = await pool.query(query, [req.params.id, user.discord_id]);

    if (result.rows.length === 0) return res.status(404).send("Replay json not found or unauthorized");

    const jsonFilePath = result.rows[0].file_path;
    const remoteResponse = await fetch(
      `${REPLAY_PIPELINE_URL}/get_json?filepath=${encodeURIComponent(jsonFilePath)}`,
    );

    if (!remoteResponse.ok) {
      const err = await remoteResponse.text();
      console.error("Python server error: ", err);
      return res.status(remoteResponse.status).send("Failed to retrieve file from processing server");
    }

    res.setHeader("Content-Type", "application/json");

    const arrayBuffer = await remoteResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (e) {
    console.error(e);
    res.status(500).send("Database error");
  }
});

// /api/replays/process
router.post("/process", ensureAuth, async (req, res) => {
  const user = req.user as User;
  if (!user) return res.status(401).send("Unauthorized");

  const { audio_id, sharecode, prompt, replay_name } = req.body as {
    audio_id?: string;
    sharecode?: string;
    prompt?: string;
    replay_name?: string;
  };

  if (!audio_id) {
    return res.status(400).json({
      error: "missing_audio_id",
      details: ["audio_id is required"],
    });
  }

  const sharecodeResult = validateSharecode(typeof sharecode === "string" ? sharecode : "");
  if (!sharecodeResult.ok) {
    return res.status(400).json({
      code: sharecodeResult.error,
      error: sharecodeResult.error === "too_long"
        ? "Sharecode is too long."
        : sharecodeResult.error === "missing"
        ? "Please enter a match sharecode."
        : "Invalid match sharecode format.",
      details: sharecodeResult.error === "invalid_format"
        ? ["Expected format: CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx (case-sensitive)"]
        : [],
    });
  }

  const normalizedSharecode = sharecodeResult.value;

  // fallback if empty
  const finalReplayName = replay_name || `Replay ${normalizedSharecode}`;

  try {
    const query = `
      SELECT a.file_path
      FROM audios a
      JOIN media_access ma ON ma.audio_id = a.audio_id
      WHERE a.audio_id = $1 AND ma.discord_id = $2`;

    const result = await pool.query(query, [audio_id, user.discord_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Audio not found" });
    }

    const pipelineResponse = await fetch(`${REPLAY_PIPELINE_URL}/create_replay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        match_code: normalizedSharecode,
        audio_id: Number(audio_id),
        prompt: prompt ?? "",
        replay_name: finalReplayName,
      }),
    });

    if (!pipelineResponse.ok) {
      const details = await pipelineResponse.text();
      return res.status(502).json({
        error: "Failed to start replay pipeline",
        details,
      });
    }

    const data = await pipelineResponse.json();

    // confirmation that its processing
    return res.json({
      success: true,
      message: "Replay pipeline initialized",
      job_id: data.job_id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error during replay processing" });
  }
});

// /api/replays/jobs/:jobId
router.get("/jobs/:jobId", ensureAuth, async (_req, res) => {
  const jobId = String(_req.params.jobId);

  try {
    console.log(`[job_status] Fetching status for job: ${jobId} from ${REPLAY_PIPELINE_URL}`);
    const pipelineResponse = await fetch(`${REPLAY_PIPELINE_URL}/job_status/${encodeURIComponent(jobId)}`);

    if (!pipelineResponse.ok) {
      const payload = await pipelineResponse.text().catch(() => "(no response body)");
      console.error(
        `[job_status] Pipeline call failed for ${jobId}: status=${pipelineResponse.status}, response=${payload}`,
      );
      return res.status(pipelineResponse.status).json({
        error: "Failed to fetch replay job status",
        pipeline_status: pipelineResponse.status,
        details: payload,
      });
    }

    const data = await pipelineResponse.json();
    console.log(`[job_status] Retrieved status for ${jobId}:`, data);
    return res.json(data);
  } catch (e) {
    console.error(`[job_status] Error contacting pipeline for job ${jobId}:`, e);
    return res.status(500).json({ error: "Server error while fetching replay job status" });
  }
});

// /api/replays/id/delete
// router.post("/:id/delete", ensureAuth, async (req, res) => {
//   const user = req.user as User;
//   if (!user) return res.status(401).send("Unauthorized");

//   const replayId = req.params.id

//   try {
//     const query = `
//       SELECT r.replay_id, r.demo_id, d.file_path
//       FROM replays r
//       JOIN demos d ON r.demo_id = d.demo_id
//       JOIN media_access ma ON ma.audio_id = r.audio_id
//       WHERE r.replay_id = $1 AND ma.discord_id = $2
//     `
//     const result = await pool.query(query, [replayId, user.discord_id]);

//     if (result.rows.length === 0) {
//       res.status(404).json({ error: "Replay not found or unauthorized to delete." })
//     }

//     const demoFilePath = result.rows[0].file_path;

//   }
// })

export default router;
