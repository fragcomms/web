import { Router } from "express";
import { Pool } from "pg";
import dotenv from "dotenv"

dotenv.config();

const router = Router();

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DB,
    password: process.env.PG_PASS,
    port: Number(process.env.PG_PORT),
});

router.get("/audio", async (_req, res) => {
    try{
        const result = await pool.query(
            "SELECT audio_id, file_ext, path, sampling_rate, creation_time FROM audio_table ORDER BY creation_time DESC"
        );
        res.json(result.rows);
    }catch(err){
        console.error("error querying audio table:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;