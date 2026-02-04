import { Link } from 'react-router-dom'

export function Navbar() {
  const navLinkClass = 'text-slate-300 hover:text-white transition-colors'
  
  return (
    <nav className="fixed top-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-600 hover:border-slate-400 transition-colors overflow-hidden"
          >
            <img
              src="src/assets/logo.png"
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </Link>

          {/* Navigation Links */}
          <div className="flex gap-6">
            <Link to="/" className={navLinkClass}>
              Home
            </Link>
            <Link to="/invite-bot" className={navLinkClass}>
              Invite
            </Link>
            <Link to="/about" className={navLinkClass}>
              About
            </Link>
            <Link to="/pricing" className={navLinkClass}>
              Pricing
            </Link>
            <Link to="/login" className={navLinkClass}>
              Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}