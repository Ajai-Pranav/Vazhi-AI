"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  // Broad profile fields
  educational_status?: string | null;
  field?: string | null;
  experience_level?: string | null;
  dream_job?: string | null;
  custom_goal?: string | null;
  confusion?: string | null;
  tech_stack?: string[];
  age?: number | null;
  // Student fields
  college?: string | null;
  course?: string | null;
  current_year?: number | null;
  total_years?: number | null;
  // Professional fields
  current_company?: string | null;
  years_of_experience?: number | null;
  current_role?: string | null;
  // Legacy
  profession?: string | null;
  has_profile: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  updateUser: () => {},
});

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Perform an authenticated fetch with automatic silent token refresh.
 *
 * - All requests use credentials: "include" so HTTP-Only cookies are sent automatically.
 * - On a 401 response the function calls POST /auth/refresh once.
 * - If the refresh succeeds the original request is retried.
 * - If the refresh fails (expired session) the user is redirected to /auth/login.
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {},
  onUnauthorized?: () => void
): Promise<Response> {
  const mergedInit: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  };

  let response = await fetch(`${API_URL}${input}`, mergedInit);

  if (response.status === 401) {
    // Attempt silent token refresh
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      // Retry the original request with fresh cookies
      response = await fetch(`${API_URL}${input}`, mergedInit);
    } else {
      // Refresh failed — session is fully expired, redirect to login
      onUnauthorized?.();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
  }

  return response;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(false);

  // On mount: attempt to load user from /auth/me (uses cookie automatically)
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });

        if (res.ok) {
          const userData: AuthUser = await res.json();
          setUser(userData);
        } else if (res.status === 401) {
          // Access token expired — attempt refresh
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setUser(refreshData.user);
          }
          // If refresh fails, user stays null → middleware/page will redirect to login
        }
      } catch {
        // Network error — user stays null
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  /**
   * Called after a successful login/signup API call.
   * The server already set the cookies — we just store the user in state.
   */
  const login = (newUser: AuthUser) => {
    setUser(newUser);
  };

  /**
   * Call POST /auth/logout to revoke all server-side refresh tokens
   * and clear the HTTP-Only cookies, then clear local state.
   */
  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even if the request fails, clear local state
    } finally {
      // Clear session storage remnants
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("explore_chat");
      }
      setUser(null);
    }
  };

  /**
   * Re-fetch the current user from the server (e.g., after profile update).
   */
  const refreshUser = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const updated: AuthUser = await res.json();
        setUser(updated);
      }
    } catch {
    } finally {
      refreshingRef.current = false;
    }
  };

  const updateUser = (newUser: AuthUser) => {
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/**
 * @deprecated Token is now stored in an HTTP-Only cookie managed by the browser.
 * This function is kept as a no-op stub so old imports don't break during migration.
 */
export function getStoredToken(): null {
  return null;
}
