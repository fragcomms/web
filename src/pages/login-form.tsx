import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"

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
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
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