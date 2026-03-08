import { Router } from "express";
import passport from "passport";
import type { UserWithToken as User } from "../types/user.js";

const router = Router();

// /api/discord
router.get("/discord", passport.authenticate("discord"));

// /api/discord/callback
router.get(
  "/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    const user = req.user as User;
    res.send(`
    <html>
      <body>
        <p>Login Successful. The window will now close in 5 seconds.</p>
          <script>
            window.opener.postMessage({ token: '${user.token}', status: 'Login successful' }, "*");
            setTimeout(() => window.close(), 5000);
        </script>
      </body>
    </html>`);
  },
);

// /api/logout
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie("connect.sid");
      res.send({ status: "Logged out" });
    });
  });
});

export default router;
