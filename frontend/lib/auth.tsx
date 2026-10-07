/**
 * Auth context: token storage, login/logout, user info, and Lohith admin clearance.
 */
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { login as apiLogin, register as apiRegister, TokenResponse } from "@/lib/api";

interface AuthContext {
  token: string | null;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  isLoggedIn: boolean;
  isLohith: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  unlockLohith: (passkey: string) => Promise<boolean>;
  lockLohith: () => void;
}

const TOKEN_KEY = "agriguard_token";
const USER_KEY = "agriguard_user";
const ADMIN_PASSKEY_KEY = "lohith_admin_key";

const Ctx = createContext<AuthContext>({
  token: null,
  userId: null,
  email: null,
  fullName: null,
  isLoggedIn: false,
  isLohith: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  unlockLohith: async () => false,
  lockLohith: () => {},
});

function checkLohithClearance(emailStr: string | null, nameStr: string | null, isUnlocked: boolean): boolean {
  if (isUnlocked) return true;
  const e = (emailStr || "").toLowerCase().trim();
  const n = (nameStr || "").toLowerCase().trim();
  return (
    e === "lohithgamer12@gmail.com" ||
    e.includes("lohith") ||
    n.includes("lohith")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(false);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    const k = sessionStorage.getItem(ADMIN_PASSKEY_KEY);
    if (t) setToken(t);
    if (k === "lohith" || k === "true") setAdminUnlocked(true);
    if (u) {
      try {
        const parsed = JSON.parse(u);
        setUserId(parsed.userId || null);
        setEmail(parsed.email || null);
        setFullName(parsed.fullName || null);
      } catch {}
    }
  }, []);

  const login = useCallback(async (userEmail: string, password: string) => {
    const res: TokenResponse = await apiLogin(userEmail, password);
    const resolvedEmail = res.email || userEmail;
    const resolvedName = res.full_name || null;
    
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(
      USER_KEY, 
      JSON.stringify({ userId: res.user_id, fullName: resolvedName, email: resolvedEmail })
    );
    
    setToken(res.access_token);
    setUserId(res.user_id);
    setEmail(resolvedEmail);
    setFullName(resolvedName);

    if (res.is_lohith || resolvedEmail.toLowerCase().includes("lohith")) {
      sessionStorage.setItem(ADMIN_PASSKEY_KEY, "lohith");
      setAdminUnlocked(true);
    }
  }, []);

  const register = useCallback(async (userEmail: string, password: string, name?: string) => {
    const res: TokenResponse = await apiRegister(userEmail, password, name);
    const resolvedEmail = res.email || userEmail;
    const resolvedName = res.full_name || name || null;

    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(
      USER_KEY, 
      JSON.stringify({ userId: res.user_id, fullName: resolvedName, email: resolvedEmail })
    );

    setToken(res.access_token);
    setUserId(res.user_id);
    setEmail(resolvedEmail);
    setFullName(resolvedName);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ADMIN_PASSKEY_KEY);
    setToken(null);
    setUserId(null);
    setEmail(null);
    setFullName(null);
    setAdminUnlocked(false);
  }, []);

  const unlockLohith = useCallback(async (passkey: string): Promise<boolean> => {
    const cleanKey = passkey.trim();
    if (cleanKey === "lohith" || cleanKey === "lohith123" || cleanKey === "lohith2026") {
      sessionStorage.setItem(ADMIN_PASSKEY_KEY, "lohith");
      setAdminUnlocked(true);
      return true;
    }

    try {
      const res = await fetch("/api/v1/admin/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: cleanKey }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authorized) {
          sessionStorage.setItem(ADMIN_PASSKEY_KEY, "lohith");
          if (data.access_token) {
            localStorage.setItem(TOKEN_KEY, data.access_token);
            setToken(data.access_token);
          }
          setAdminUnlocked(true);
          return true;
        }
      }
    } catch {}
    return false;
  }, []);

  const lockLohith = useCallback(() => {
    sessionStorage.removeItem(ADMIN_PASSKEY_KEY);
    setAdminUnlocked(false);
  }, []);

  const isLohith = checkLohithClearance(email, fullName, adminUnlocked);

  return (
    <Ctx.Provider
      value={{
        token,
        userId,
        email,
        fullName,
        isLoggedIn: !!token,
        isLohith,
        login,
        register,
        logout,
        unlockLohith,
        lockLohith,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
