"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

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
  isReady: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string; codigo?: number }>;
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
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    refreshTimerRef.current = null;
    warnTimerRef.current = null;
  };

  const setAuth = useCallback((newToken: string, newUser: AuthUser) => {
    // Token stays in memory only — never localStorage — to prevent XSS token theft
    localStorage.setItem("payload", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("payload");
    setToken(null);
    setUser(null);
    clearRefreshTimer();
  }, []);

  const sessionExpired = useCallback(() => {
    const wasLoggedIn = !!localStorage.getItem("payload");
    clearAuth();
    if (wasLoggedIn) {
      toast("Tu sesión expiró. Vas a ser redirigido al login.", "error");
      setTimeout(() => router.push("/login"), 3000);
    }
  }, [clearAuth, router]);

  const scheduleRefresh = useCallback((currentToken: string, doRefresh: () => void) => {
    clearRefreshTimer();
    const exp = getTokenExpiry(currentToken);
    if (!exp) return;
    const msLeft = exp - Date.now();
    if (msLeft <= 0) { doRefresh(); return; }
    // Warning at 60%, refresh at 80%
    warnTimerRef.current = setTimeout(() => {
      toast("Tu sesión está por expirar.", "warning");
    }, msLeft * 0.6);
    refreshTimerRef.current = setTimeout(doRefresh, msLeft * 0.8);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("payload");

    // Show cached user immediately for instant UX while refresh runs in background
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch { localStorage.removeItem("payload"); }
    }

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
        sessionExpired();
      } catch {
        sessionExpired();
      } finally {
        setIsReady(true);
      }
    };

    doRefresh();

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
            sessionExpired();
          }
        } catch {
          sessionExpired();
        }
      };
      scheduleRefresh(data.jwt, doRefresh);
      router.push("/");
      return { ok: true };
    }
    return { ok: false, error: data.mensaje || "Error al iniciar sesión", codigo: data.codigo };
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    clearAuth();
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn: !!user && !!token, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
