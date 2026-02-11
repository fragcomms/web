import { Link } from 'react-router-dom'
import { NavLogo } from './NavBar/logo'
import { useAuth } from '../context/AuthContext'

const navLinkClassName =
  'text-lg text-slate-300 transition-colors hover:text-white'
const navItems = [
  { to: '/about', label: 'About' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/invite-bot', label: 'Invite' },
  { to: '/replays', label: 'Replays' },
  { to: '/settings', label: 'Settings' },
]

const logoutClassName =
  'rounded-md bg-slate-700 px-5 py-2.5 text-base text-white transition-colors hover:bg-slate-600'

export function Navbar() {
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            <NavLogo to="/login" />
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
  )
}