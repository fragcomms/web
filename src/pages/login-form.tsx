import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import DiscordLogo from "../assets/discord-logo.svg?react";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Check if user is already logged in on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("http://localhost:5000/profile", {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.log('Not logged in');
    }
  };

  const handleDiscordLogin = async () => {
    setIsLoading(true);

    try {
      // Open Discord OAuth in popup
      const popup = window.open(
        "http://localhost:5000/auth/discord",
        'discord-login',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for popup to close or receive message
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);
          // Check if login was successful
          checkAuthStatus();
        }
      }, 1000);

    } catch (error) {
      console.error('Error initiating Discord login', error);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/logout", {
        method: 'POST',
        credentials: 'include'
      });
      setIsLoggedIn(false);
      setUserData(null);
    } catch (error) {
      console.error('Error logging out', error);
    }
  };

  const handleFetchUserData = async () => {
    try {
      window.open("http://localhost:5000/profile", '_blank', 'width=600,height=700');
    } catch (error) {
      console.error('Error fetching user data', error);
    }
  };

  const handleFetchConnections = async () => {
    try {
      window.open("http://localhost:5000/connections", '_blank', 'width=600,height=700');
    } catch (error) {
      console.error('Error fetching connections', error);
    }
  };

  // If user is logged in, show profile info and options
  if (isLoggedIn && userData) {
    return (
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="space-y-1">
          <CardTitle className="text-white">Welcome back!</CardTitle>
          <CardDescription className="text-slate-400">
            {userData.username}#{userData.discriminator}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <img
              src={userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : '/default-avatar.png'}
              alt="Profile"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <p className="text-white font-medium">{userData.global_name || userData.username}</p>
              <p className="text-slate-400 text-sm">{userData.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleFetchUserData}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white"
            >
              View Profile Data
            </Button>
            <Button
              onClick={handleFetchConnections}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white"
            >
              View Connections
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Logout
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If not logged in, show login form
  return (
    <Card className="w-full max-w-md bg-slate-800 border-slate-700">
      <CardHeader className="space-y-1">
        <CardTitle className="text-white">Welcome back</CardTitle>
        <CardDescription className="text-slate-400">
          Sign in with your Discord account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDiscordLogin}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
          disabled={isLoading}
        >
          <DiscordLogo className="w-5 h-5 mr-2 fill-white" />
          {isLoading ? "Connecting..." : "Continue with Discord"}
        </Button>
      </CardContent>
      <CardFooter>
        <p className="text-center w-full text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </CardFooter>
    </Card>
  );
}