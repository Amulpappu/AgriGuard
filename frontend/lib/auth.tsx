/**
 * Auth context: token storage, login/logout, user info, and Lohith admin clearance.
 * Admin clearance is granted only to the authorised email (see checkLohithClearance).
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
  /** False until the stored session has been read on the client. */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const TOKEN_KEY = "agriguard_token";
const USER_KEY = "agriguard_user";
// Legacy key from the removed passkey unlock; cleared on load and logout.
const ADMIN_PASSKEY_KEY = "lohith_admin_key";

const Ctx = createContext<AuthContext>({
  token: null,
  userId: null,
  email: null,
  fullName: null,
  isLoggedIn: false,
  isLohith: false,
  ready: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

function checkLohithClearance(emailStr: string | null): boolean {
  const e = (emailStr || "").toLowerCase().trim();
  return e === "lohithgamer12@gmail.com" || e === "lohithgamer12@gmail";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(ADMIN_PASSKEY_KEY);
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t) setToken(t);
    if (u) {
      try {
        const parsed = JSON.parse(u);
        const resolvedEmail = parsed.email || null;
        setUserId(parsed.userId || null);
        setEmail(resolvedEmail);
        setFullName(parsed.fullName || null);
      } catch {}
    }
    setReady(true);
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
  }, []);

  // Admin clearance is derived solely from the signed-in email; there is no
  // passkey or alternate unlock path.
  const isLohith = checkLohithClearance(email);

  return (
    <Ctx.Provider
      value={{
        token,
        userId,
        email,
        fullName,
        isLoggedIn: !!token,
        isLohith,
        ready,
        login,
        register,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
