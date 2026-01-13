import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, type User, ApiError } from "../lib/api";

// ============================================
// Types
// ============================================

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    currency?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; currency?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check authentication status on mount
  const checkAuth = useCallback(async () => {
    try {
      const { user } = await authApi.getMe();
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      // Not authenticated - this is expected for logged out users
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { user } = await authApi.login({ email, password });
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Register
  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      currency?: string;
    }) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const { user } = await authApi.register(data);
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    []
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors - we're logging out anyway
    } finally {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(
    async (data: { name?: string; currency?: string }) => {
      const { user } = await authApi.updateProfile(data);
      setState((prev) => ({
        ...prev,
        user,
      }));
    },
    []
  );

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const { user } = await authApi.getMe();
      setState((prev) => ({
        ...prev,
        user,
      }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// ============================================
// Utilities
// ============================================

/**
 * Get initials from user name for avatar fallback
 */
export function getUserInitials(name: string): string {
  if (!name) return "?";
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 6) return "Buenas noches";
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
