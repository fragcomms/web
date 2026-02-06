import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Define the shape of the context
type AuthContextType = {
  user: any | null;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth on initial load (app startup)
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Replace after finish
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      });
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, checkAuthStatus, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the context easily
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}