"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AuthResponse } from "../types/auth";

interface AuthContextValue {
  user: AuthResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (auth: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "auth";

function subscribeAuth(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const rawSnapshot = useSyncExternalStore(subscribeAuth, getSnapshot, () => null);

  const user = useMemo(() => {
    if (rawSnapshot === null) return null;
    try {
      const data = JSON.parse(rawSnapshot) as AuthResponse;
      if (new Date(data.expiresAt) <= new Date()) return null;
      return data;
    } catch {
      return null;
    }
  }, [rawSnapshot]);

  const setUser = useCallback((auth: AuthResponse) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    window.dispatchEvent(new Event("storage"));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("storage"));
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading: false,
      isAuthenticated: user !== null,
      setUser,
      logout,
    }),
    [user, setUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
