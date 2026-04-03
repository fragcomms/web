import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useMatch } from "react-router-dom";
import { useAuth } from "../utils/context/context";
import { NavLogo } from "./NavBar/logo";

const navLinkClassName = "text-lg text-slate-300 transition-colors hover:text-white";
const navItems = [
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/invite-bot", label: "Invite" },
  { to: "/replays", label: "Replays" },
  { to: "/settings", label: "Settings" },
];

const logoutClassName = "rounded-md bg-slate-700 px-5 py-2.5 text-base text-white transition-colors hover:bg-slate-600";

type NavbarProps = {
  onNavOffsetChange?: (offsetPx: number) => void;
};

export function Navbar({ onNavOffsetChange }: NavbarProps) {
  const { logout } = useAuth();
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

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <nav
        className={`fixed left-0 right-0 top-0 z-50 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm transition-all duration-300 ease-out ${
          isReplayPage && isCollapsed
            ? "-translate-y-full opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
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
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <button
              type="button"
              className={logoutClassName}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {isReplayPage && (
        <button
          type="button"
          aria-label={isCollapsed ? "Open navbar" : "Close navbar"}
          title={isCollapsed ? "Open navbar" : "Close navbar"}
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`fixed right-6 z-50 rounded-b-lg border border-slate-700 border-t-0 bg-slate-800/95 px-3 py-1.5 text-slate-200 transition-all duration-300 ease-out hover:bg-slate-700 hover:text-white ${
            isCollapsed ? "top-0" : "top-20"
          }`}
        >
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      )}
    </>
  );
}
