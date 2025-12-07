import { Link } from 'react-router-dom'

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16">
          <div className="flex items-center gap-8">
            <Link 
              to="/" 
              className = "flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-600 text-white hover:border-slate-400 transition-colors overflow-hidden"            >
              <img
                src = "src/assets/logo.png"
                alt = "Logo"
                className = "w-full h-full object-cover"
              />
            </Link>
            <div className="flex gap-6">
              <Link 
                to="/" 
                className="text-slate-300 hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link 
                to="/invite-bot" 
                className="text-slate-300 hover:text-white transition-colors"
              >
                Invite Bot
              </Link>
              <Link 
                to="/pricing" 
                className="text-slate-300 hover:text-white transition-colors"
              >
                Pricing
              </Link>
              <Link 
                to="/login" 
                className="text-slate-300 hover:text-white transition-colors"
              >
                Profile
              </Link>
              <Link 
                to="/replays" 
                className="text-slate-300 hover:text-white transition-colors"
              >
                Replays
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}