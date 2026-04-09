import { Link } from "react-router-dom";
import { NavLogo } from "./NavBar/logo";

const navLinkClass = "text-lg transition-opacity hover:opacity-80";
const loginClassName = "rounded-md px-5 py-2.5 text-base transition-opacity hover:opacity-90";
const navItems = [
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/invite-bot", label: "Invite" },
];

export function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 backdrop-blur-sm border-b z-50"
      style={{
        backgroundColor: "var(--app-surface)",
        borderColor: "var(--app-border)",
        color: "var(--app-foreground)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <NavLogo to="/" />

            {/* Navigation Links */}
            <div className="flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={navLinkClass}
                  style={{ color: "var(--app-muted)" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <Link
            to="/login"
            className={loginClassName}
            style={{ backgroundColor: "var(--app-surface-strong)", color: "var(--app-foreground)" }}
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
