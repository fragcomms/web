import { Router } from 'express';
import fetch from 'node-fetch';
import { ensureAuth } from '../middleware/authentication.js';
import { UserWithToken as User } from '../types/user.js';

const router = Router();

// /api/profile
router.get("/profile", ensureAuth, async (req, res) => {
  const user = req.user as User;
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${user.token}`}
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error fetching profile");
  }
});

// /api/connections
router.get("/connections", ensureAuth, async (req, res) => {
  const user = req.user as User;
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me/connections", {
      headers: { Authorization: `Bearer ${user.token}`}
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error fetching profile");
  }
});

export default router;