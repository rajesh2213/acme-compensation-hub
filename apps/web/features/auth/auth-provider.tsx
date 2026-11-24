"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import {
  fetchCsrfToken,
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
} from "./api";
import type { AuthUser } from "./types";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function sessionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") {
      return "Unable to reach the server. Check your connection and try again.";
    }
    return error.message || "Session check failed. Try again.";
  }
  return "Session check failed. Try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const clearClientAuth = useCallback(() => {
    setCsrfToken(null);
    setUser(null);
    setError(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  const refreshSession = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const nextUser = await fetchCurrentUser(signal);
        if (signal?.aborted) return;
        setUser(nextUser);
        setError(null);
        if (nextUser) {
          setStatus("authenticated");
        } else {
          setCsrfToken(null);
          setStatus("unauthenticated");
          queryClient.clear();
        }
      } catch (err) {
        if (signal?.aborted || isAbortError(err)) return;
        setError(sessionErrorMessage(err));
        setStatus("error");
      }
    },
    [queryClient],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const nextUser = await fetchCurrentUser(controller.signal);
        if (cancelled) return;
        setUser(nextUser);
        setError(null);
        if (nextUser) {
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
          queryClient.clear();
        }
      } catch (err) {
        if (cancelled || isAbortError(err)) return;
        setError(sessionErrorMessage(err));
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryClient]);

  const ensureCsrf = useCallback(async () => {
    const token = await fetchCsrfToken();
    setCsrfToken(token);
    return token;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const token = await ensureCsrf();
      try {
        const nextUser = await loginRequest(email, password, token);
        // Session regenerated — CSRF must be refreshed for later mutations.
        setCsrfToken(null);
        setUser(nextUser);
        setError(null);
        setStatus("authenticated");
      } catch (err) {
        setCsrfToken(null);
        throw err;
      }
    },
    [ensureCsrf],
  );

  const logout = useCallback(async () => {
    const token = csrfToken ?? (await ensureCsrf());
    try {
      await logoutRequest(token);
      clearClientAuth();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearClientAuth();
        return;
      }
      throw err;
    }
  }, [csrfToken, ensureCsrf, clearClientAuth]);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      login,
      logout,
      refreshSession: () => refreshSession(),
    }),
    [user, status, error, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
