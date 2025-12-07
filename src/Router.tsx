import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar as PublicNavbar } from './components/PublicNavbar'
import { Navbar as LoggedNavbar } from './components/LoggedNavbar'
import { LoginForm } from './pages/login-form'
import { ReplayLibrary } from './pages/replays/replay-library'
import { ReplayDetails } from './pages/replays/replay-details';
import ImportReplay from './pages/replays/replay-import'
import Home from './pages/Home'
import About from './pages/About'
import InviteBot from './pages/invite-bot'
import { useAuth } from './context/AuthContext';

export default function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Fixed Navbar */}
        {user ? <LoggedNavbar /> : <PublicNavbar />}

        {/* Page Content with top padding to account for fixed navbar */}
        <div className="pt-16"> {/* Add padding-top for fixed navbar height */}
          <Routes>
            {/* Default Page - Home */}
            <Route path="/" element={
              <div className="main-content">
                <Home />
              </div>
            } />

            {/* Library accessible only via direct URL */}
            <Route path="/replays" element={
              <div className="w-full min-h-[calc(100vh-64px)] flex flex-col justify-start items-center pt-8 px-4">
                <ReplayLibrary />
              </div>
            } />

            <Route path="/replays/import" element={
              <div className="main-content">
                <ImportReplay />
              </div>
            } />

            <Route path="/replays/:id" element={
              <div className="w-full min-h-[calc(100vh-64px)] pt-8 px-4 flex flex-col items-center">
                <ReplayDetails />
              </div>
            } />

            <Route path="/about" element={
              <div className="main-content">
                <div className="text-white text-center">
                  <h1 className="text-4xl font-bold mb-4">About Us</h1>
                  <p>mission statement(?) coming soon</p>
                </div>
              </div>
            } />

            <Route path="/invite-bot" element={
              <div className="main-content">
                <InviteBot />
              </div>
            } />

            <Route path="/pricing" element={
              <div className="main-content">
                <div className="text-white text-center">
                  <h1 className="text-4xl font-bold mb-4">Pricing</h1>
                  <p>lol not yet</p>
                </div>
              </div>
            } />

            <Route path="/login" element={
              <div className="centered-card">
                <LoginForm />
              </div>
            } />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}