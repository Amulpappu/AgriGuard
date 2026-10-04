/**
 * Auth context: token storage, login/logout, user info.
 */
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { login as apiLogin, register as apiRegister, TokenResponse } from "@/lib/api";

interface AuthContext {
  token: string | null;
  userId: string | null;
  fullName: string | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const TOKEN_KEY = "agriguard_token";
const USER_KEY = "agriguard_user";

const Ctx = createContext<AuthContext>({
  token: null,
  userId: null,
  fullName: null,
  isLoggedIn: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t) setToken(t);
    if (u) {
      try {
        const parsed = JSON.parse(u);
        setUserId(parsed.userId);
        setFullName(parsed.fullName);
      } catch {}
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res: TokenResponse = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify({ userId: res.user_id, fullName: res.full_name }));
    setToken(res.access_token);
    setUserId(res.user_id);
    setFullName(res.full_name || null);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const res: TokenResponse = await apiRegister(email, password, fullName);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify({ userId: res.user_id, fullName: res.full_name }));
    setToken(res.access_token);
    setUserId(res.user_id);
    setFullName(res.full_name || null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUserId(null);
    setFullName(null);
  }, []);

  return (
    <Ctx.Provider value={{ token, userId, fullName, isLoggedIn: !!token, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
