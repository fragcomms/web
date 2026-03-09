import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navbar as LoggedNavbar } from "./components/AuthNavBar";
import { Navbar as PublicNavbar } from "./components/PublicNavBar";
import { ProtectedRoute } from "./components/RouteProtector";
import { useAuth } from "./context/AuthContext";
import About from "./pages/About.tsx";
import Home from "./pages/Home";
import InviteBot from "./pages/invite-bot";
import { LoginForm } from "./pages/login-form";
import { Pricing } from "./pages/Pricing";
// import { ReplayDetails } from "./pages/replays/replay-details";
import GPUTest from "./pages/replays/replay-gpu";
import { AudioLibrary } from "./pages/replays/replay-import";
import { ReplayLibrary } from "./pages/replays/replay-library";
import Settings from "./pages/Settings";

export default function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-800">
        {/* Fixed Navbar */}
        {user ? <LoggedNavbar /> : <PublicNavbar />}

        {/* Page Content with top padding to account for fixed navbar */}
        <div className="flex-1 flex flex-col pt-20">
          {/* Add padding-top for fixed navbar height */}
          <Routes>
            {/* Default Page - Home */}
            <Route
              path="/"
              element={
                <div className="w-full flex-1 flex flex-col p-4 items-center justify-center">
                  <Home />
                </div>
              }
            />

            {/* protected */}
            <Route
              path="/replays"
              element={
                <ProtectedRoute>
                  <div className="w-full min-h-[calc(100vh-80px)] flex flex-1 flex-col justify-start items-center pt-8 px-4">
                    <ReplayLibrary />
                  </div>
                </ProtectedRoute>
              }
            />

            {/* protected */}
            <Route
              path="/replays/import"
              element={
                <ProtectedRoute>
                  <div className="w-full flex-1 flex flex-col p-4">
                    <AudioLibrary />
                  </div>
                </ProtectedRoute>
              }
            />

            {/* protected */}
            <Route
              path="/replays/:id"
              element={
                <ProtectedRoute>
                  <div className="w-full min-h-[calc(100vh-80px)] pt-8 px-4 flex flex-col items-center">
                    <GPUTest />
                  </div>
                </ProtectedRoute>
              }
            />

            {/* protected */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <div className="w-full flex-1 flex flex-col p-4">
                    <Settings />
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/invite-bot"
              element={
                <div className="w-full flex-1 flex flex-col p-4">
                  <InviteBot />
                </div>
              }
            />

            <Route
              path="/about"
              element={
                <div className="w-full flex-1 flex flex-col p-4 items-center justify-center">
                  <About />
                </div>
              }
            />

            <Route
              path="/pricing"
              element={
                <div className="w-full flex-1 flex flex-col p-4">
                  <Pricing />
                </div>
              }
            />

            <Route
              path="/login"
              element={
                <div className="w-full flex-1 flex flex-col p-4 items-center justify-center">
                  <LoginForm />
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
