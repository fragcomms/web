import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { DiscordProfile as User } from "../types/user";
import { AuthContext, type AuthContextType } from "./context";

export function AuthProvider({ children, value }: { children: ReactNode; value?: AuthContextType; }) {
  const [user, setUser] = useState<User | null>(value?.user ?? null);
  const [isLoading, setIsLoading] = useState(value?.isLoading ?? true);

  const checkAuthStatus = useCallback(async () => {
    if (value?.checkAuthStatus) return; // If value is provided, skip fetching
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/user/profile`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error(e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [value?.checkAuthStatus]);

  // Check auth on initial load (app startup)
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // const checkAuthStatus = async () => {
  //   if (value?.checkAuthStatus) return; // If value is provided, skip fetching
  //   try {
  //     // Replace after finish
  //     const response = await fetch(`${import.meta.env.VITE_API_URL}/user/profile`, {
  //       credentials: "include",
  //     });
  //     if (response.ok) {
  //       const data = await response.json();
  //       setUser(data);
  //     } else {
  //       setUser(null);
  //     }
  //   } catch (e) {
  //     console.error(e);
  //     setUser(null);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const logout = async () => {
    if (value?.logout) return value.logout();
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: value?.user ?? user,
        isLoading: value?.isLoading ?? isLoading,
        checkAuthStatus: value?.checkAuthStatus ?? checkAuthStatus,
        logout: value?.logout ?? logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// // Custom hook to use the context easily
// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// }
