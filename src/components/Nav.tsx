import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Nav() {
  const { user, isLoggedIn, logout, isLoading } = useAuth()

  if (isLoading) {
    return (
      <nav className="bg-gray-800 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <span>Loading...</span>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex gap-4">
          <Link to="/" className="hover:text-blue-400 transition">Home</Link>
          <Link to="/about" className="hover:text-blue-400 transition">About</Link>
          
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="hover:text-blue-400 transition">Dashboard</Link>
              <Link to="/profile" className="hover:text-blue-400 transition">Profile</Link>
            </>
          ) : (
            <Link to="/login" className="hover:text-blue-400 transition">Login</Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <span className="text-gray-300">Welcome, {user?.name}!</span>
              <button 
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link 
                to="/login" 
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="border border-blue-600 hover:bg-blue-600 px-4 py-2 rounded transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}