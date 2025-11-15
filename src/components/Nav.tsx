import { Link } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="flex gap-4">
        <Link to="/" className="hover:text-blue-400">Home</Link>
        <Link to="/about" className="hover:text-blue-400">About</Link>
      </div>
    </nav>
  )
}