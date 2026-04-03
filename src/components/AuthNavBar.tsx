import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useMatch } from "react-router-dom";
import { useAuth } from "../utils/context/context";
import { NavLogo } from "./NavBar/logo";

const navLinkClassName = "text-lg transition-opacity hover:opacity-80";
const navItems = [
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/invite-bot", label: "Invite" },
  { to: "/replays", label: "Replays" },
  { to: "/settings", label: "Settings" },
];

type NavbarProps = {
  onNavOffsetChange?: (offsetPx: number) => void;
};

export function Navbar({ onNavOffsetChange }: NavbarProps) {
  const { user } = useAuth();
  const isReplayPage = Boolean(useMatch("/replays/:id"));
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!isReplayPage) {
      setIsCollapsed(false);
    }
  }, [isReplayPage]);

  useEffect(() => {
    const offset = isReplayPage && isCollapsed ? 0 : 80;
    onNavOffsetChange?.(offset);
  }, [isReplayPage, isCollapsed, onNavOffsetChange]);

  useEffect(() => {
    return () => {
      onNavOffsetChange?.(80);
    };
  }, [onNavOffsetChange]);

  return (
    <>
      <nav
        className={`fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-sm transition-all duration-300 ease-out ${
          isReplayPage && isCollapsed
            ? "-translate-y-full opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
        style={{ backgroundColor: "var(--app-surface)", borderColor: "var(--app-border)", color: "var(--app-foreground)" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-8">
              <NavLogo to="/" />
              <div className="flex gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={navLinkClassName}
                      style={{ color: "var(--app-muted)" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <Link
              to="/settings"
              aria-label="Open settings"
              title="Open settings"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border transition-opacity hover:opacity-90"
              style={{ borderColor: "var(--app-border)", backgroundColor: "var(--app-surface-strong)" }}
            >
              <img
                src={user?.avatar
                  ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                  : "/default-avatar.png"}
                alt="User settings"
                className="h-10 w-10 rounded-full object-cover"
              />
            </Link>
          </div>
        </div>
      </nav>

      {isReplayPage && (
        <button
          type="button"
          aria-label={isCollapsed ? "Open navbar" : "Close navbar"}
          title={isCollapsed ? "Open navbar" : "Close navbar"}
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`fixed right-6 z-50 rounded-b-lg border border-t-0 px-3 py-1.5 transition-all duration-300 ease-out hover:opacity-90 ${
            isCollapsed ? "top-0" : "top-20"
          }`}
          style={{ backgroundColor: "var(--app-surface)", borderColor: "var(--app-border)", color: "var(--app-foreground)" }}
        >
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      )}
    </>
  );
}
