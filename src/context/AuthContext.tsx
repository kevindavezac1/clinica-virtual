"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AuthUser {
  id: number;
  nombre: string;
  apellido: string;
  rol: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
  };

  const setAuth = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("payload", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("payload");
    setToken(null);
    setUser(null);
    clearRefreshTimer();
  }, []);

  const scheduleRefresh = useCallback((currentToken: string, doRefresh: () => void) => {
    clearRefreshTimer();
    const exp = getTokenExpiry(currentToken);
    if (!exp) return;
    const delay = exp - Date.now() - 60_000; // refresh 1min before expiry
    if (delay > 0) {
      refreshTimerRef.current = setTimeout(doRefresh, delay);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("payload");
    const exp = storedToken ? getTokenExpiry(storedToken) : null;
    const tokenValid = storedToken && storedUser && exp && exp > Date.now();

    const doRefresh = async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.token && data.user) {
            setAuth(data.token, data.user);
            scheduleRefresh(data.token, doRefresh);
            return;
          }
        }
        clearAuth();
      } catch {
        clearAuth();
      }
    };

    if (tokenValid) {
      setToken(storedToken!);
      setUser(JSON.parse(storedUser!));
      scheduleRefresh(storedToken!, doRefresh);
    } else {
      doRefresh();
    }

    return () => clearRefreshTimer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: username, password }),
    });
    const data = await res.json();
    if (res.status === 429) {
      return { ok: false, error: data.mensaje || "Demasiados intentos. Intentá más tarde." };
    }
    if (data.codigo === 200 && data.jwt) {
      setAuth(data.jwt, data.payload);
      const doRefresh = async () => {
        try {
          const r = await fetch("/api/auth/refresh", { method: "POST" });
          if (r.ok) {
            const d = await r.json();
            if (d.token && d.user) {
              setAuth(d.token, d.user);
              scheduleRefresh(d.token, doRefresh);
            }
          } else {
            clearAuth();
          }
        } catch {
          clearAuth();
        }
      };
      scheduleRefresh(data.jwt, doRefresh);
      router.push("/");
      return { ok: true };
    }
    return { ok: false, error: data.mensaje || "Error al iniciar sesión" };
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    clearAuth();
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
