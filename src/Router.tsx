import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { Navbar as LoggedNavbar } from "./components/AuthNavBar";
import { Navbar as PublicNavbar } from "./components/PublicNavBar";
import { ProtectedRoute } from "./components/RouteProtector";
import About from "./pages/About";
import Home from "./pages/Home";
import InviteBot from "./pages/invite-bot";
import { LoginForm } from "./pages/login-form";
import { Pricing } from "./pages/Pricing";
import { useAuth } from "./utils/context/context";
// import { ReplayPage } from "./pages/replays/ReplayPage";
import { AudioLibrary } from "./pages/replays/ReplayImport";
import { ReplayLibrary } from "./pages/replays/ReplayLibrary";
import ReplayPage from "./pages/replays/ReplayPage";
import Settings from "./pages/Settings";

const shellThemeStyle = {
  backgroundColor: "var(--app-bg)",
  color: "var(--app-foreground)",
};

export default function Router() {
  const { user, isLoading } = useAuth();
  const [navOffsetPx, setNavOffsetPx] = useState(80);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={shellThemeStyle}
      >
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div
        className="min-h-screen flex flex-col"
        style={shellThemeStyle}
      >
        {/* Fixed Navbar */}
        {user ? <LoggedNavbar onNavOffsetChange={setNavOffsetPx} /> : <PublicNavbar />}

        {/* Page Content with top padding to account for fixed navbar */}
        <div className="flex-1 flex flex-col transition-[padding] duration-300 ease-out" style={{ paddingTop: `${navOffsetPx}px` }}>
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
                  <div className="w-full min-h-[calc(100vh-80px)] pt-4 px-4 flex flex-col items-center">
                    <ReplayPage />
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
                <div className="w-full flex-1 flex flex-col px-4 pb-4 items-center justify-start">
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
