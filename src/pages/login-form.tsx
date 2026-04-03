import { useState } from "react";
import DiscordLogo from "../assets/discord-logo.svg?react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../utils/context/context";

interface LoginFormProps {
  testLoading?: boolean; // for unit testing
}

export function LoginForm({ testLoading }: LoginFormProps) {
  const { user, checkAuthStatus, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleDiscordLogin = async () => {
    setIsLoading(true);

    try {
      const popup = window.open(
        `${import.meta.env.VITE_API_URL}/auth/discord`,
        "discord-login",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      );

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);
          checkAuthStatus();
        }
      }, 1000);
    } catch (e) {
      console.error("Error with Discord login", e);
      setIsLoading(false);
    }
  };

  const handleFetchUserData = () => {
    window.open(`${import.meta.env.VITE_API_URL}/user/profile`, "_blank", "width=600,height=700");
  };

  const handleFetchConnections = () => {
    window.open(`${import.meta.env.VITE_API_URL}/user/connections`, "_blank", "width=600,height=700");
  };

  // Determine button disabled state for testing
  const buttonDisabled = isLoading || testLoading;

  if (user) {
    return (
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="space-y-1">
          <CardTitle className="text-white text-center">Welcome back!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : "/default-avatar.png"}
              alt="Profile"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <p className="text-white font-medium">{user.global_name || user.username}</p>
              <p className="text-slate-400 text-sm">{user.email}</p>
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
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Logout
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-slate-800 border-slate-700">
      <CardHeader className="space-y-1">
        <CardTitle className="text-white text-center">Welcome back!</CardTitle>
        <CardDescription className="text-slate-400">
          Sign in with your Discord account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDiscordLogin}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
          disabled={buttonDisabled}
        >
          <DiscordLogo className="w-5 h-5 mr-2 fill-white" />
          {buttonDisabled ? "Connecting..." : "Continue with Discord"}
        </Button>
      </CardContent>
      <CardFooter>
        <p className="text-center w-full text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardFooter>
    </Card>
  );
}
