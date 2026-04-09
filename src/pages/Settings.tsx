import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { useAuth } from "../utils/context/context";
import { applyTheme, resolveTheme, setTheme } from "../utils/theme.ts";

export default function Settings() {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(() => resolveTheme() === "dark");

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.checked;

    setIsDark(nextValue);
    setTheme(nextValue ? "dark" : "light");
  };

  const handleFetchUserData = () => {
    window.open(`${import.meta.env.VITE_API_URL}/user/profile`, "_blank", "width=600,height=700");
  };

  const handleFetchConnections = () => {
    window.open(`${import.meta.env.VITE_API_URL}/user/connections`, "_blank", "width=600,height=700");
  };

  return (
    <div
      className="mx-auto w-full max-w-2xl px-4 py-10"
      style={{ color: "var(--app-foreground)" }}
    >
      <h2 className="mt-8 text-xl font-semibold">Web Settings</h2>
      <div
        className="mt-6 rounded-lg border p-6"
        style={{ borderColor: "var(--app-border)", backgroundColor: "var(--app-surface)" }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <span className="w-full text-center text-base font-semibold" style={{ color: "var(--app-muted)" }}>
            Light Mode
          </span>
          <label className="relative inline-flex h-6 w-11 items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={isDark}
              onChange={handleToggle}
              aria-label="Toggle dark mode"
            />
            <span
              className="absolute inset-0 rounded-full transition-colors peer-checked:bg-blue-500"
              style={{ backgroundColor: "var(--app-surface-strong)" }}
            />
            <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </label>
          <span className="w-full text-center text-base font-semibold" style={{ color: "var(--app-muted)" }}>
            Dark Mode
          </span>
        </div>
      </div>

      <div className="my-8 border-t" style={{ borderColor: "var(--app-border)" }} />

      <h2 className="text-xl font-semibold">Account Settings</h2>
      <div
        className="mt-6 rounded-lg border p-6"
        style={{ borderColor: "var(--app-border)", backgroundColor: "var(--app-surface)" }}
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <img
              src={user?.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : "/default-avatar.png"}
              alt="Profile"
              className="h-12 w-12 rounded-full"
            />
            <div>
              <p className="font-medium" style={{ color: "var(--app-foreground)" }}>
                {user?.global_name || user?.username || "Unknown User"}
              </p>
              <p className="text-sm" style={{ color: "var(--app-muted)" }}>
                {user?.email || "No email available"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleFetchUserData}
              className="w-full bg-slate-700 text-white hover:bg-slate-600"
            >
              View Profile Data
            </Button>
            <Button
              onClick={handleFetchConnections}
              className="w-full bg-slate-700 text-white hover:bg-slate-600"
            >
              View Connections
            </Button>
          </div>
        </div>
      </div>

      <div
        className="mt-6 rounded-lg border p-6"
        style={{ borderColor: "var(--app-border)", backgroundColor: "var(--app-surface)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mt-1 text-sm" style={{ color: "var(--app-muted)" }}>
              Sign out of your current session.
            </p>
          </div>
          <Button
            onClick={logout}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
