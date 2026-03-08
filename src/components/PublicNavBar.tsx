import { Link } from "react-router-dom";
import { NavLogo } from "./NavBar/logo";

const navLinkClass =
  "text-lg text-slate-300 hover:text-white transition-colors";
const loginClassName =
  "rounded-md bg-slate-700 px-5 py-2.5 text-base text-white transition-colors hover:bg-slate-600";
const navItems = [
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/invite-bot", label: "Invite" },
];

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <NavLogo to="/" />

            {/* Navigation Links */}
            <div className="flex gap-6">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <Link to="/login" className={loginClassName}>
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
