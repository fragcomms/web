import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { LoginForm } from './pages/login-form'
import { ReplayLibrary } from './pages/replay-library'
import Home from './pages/Home'
import About from './pages/About'

export default function Router() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Fixed Navbar */}
        <Navbar />
        
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
            <Route path="/library" element={
              <div className="main-content">
                <ReplayLibrary />
              </div>
            } />
            
            <Route path="/about" element={
              <div className="main-content">
                <About />
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