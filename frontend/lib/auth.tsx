/**
 * Auth context backed by Supabase Auth: session, login/logout, user info, and
 * Lohith admin clearance.
 *
 * The session (and its signed JWT) comes from supabase.auth; nothing here is
 * trusted by the server. Admin data is protected by RLS policies in Supabase and
 * by require_lohith_admin in the FastAPI backend; `isLohith` only drives the UI.
 */
"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { login as apiLogin, register as apiRegister } from "@/lib/api";
import { supabase, ADMIN_EMAIL } from "@/lib/supabase";
import { invalidateCached } from "@/lib/useCachedQuery";

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

// Mirror of the current access token for synchronous Authorization headers
// (lib/api.ts authHeaders, admin page). Kept in step with the Supabase session.
const TOKEN_KEY = "agriguard_token";
// Legacy keys from the removed client-side auth; cleared on load and logout.
const LEGACY_USER_KEY = "agriguard_user";
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

/** Admin needs both the authorised email and the server-assigned admin role. */
function checkLohithClearance(session: Session | null): boolean {
  const user = session?.user;
  if (!user) return false;
  return (user.email || "").toLowerCase() === ADMIN_EMAIL && user.app_metadata?.role === "admin";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  const applySession = useCallback((s: Session | null) => {
    const newUserId = s?.user?.id ?? null;
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== newUserId) {
      invalidateCached("");
    }
    prevUserIdRef.current = newUserId;

    if (s) localStorage.setItem(TOKEN_KEY, s.access_token);
    else localStorage.removeItem(TOKEN_KEY);
    setSession(s);
  }, []);

  useEffect(() => {
    sessionStorage.removeItem(ADMIN_PASSKEY_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      applySession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      applySession(s);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const login = useCallback(async (userEmail: string, password: string) => {
    await apiLogin(userEmail, password);
    const { data } = await supabase.auth.getSession();
    applySession(data.session);
  }, [applySession]);

  const register = useCallback(async (userEmail: string, password: string, name?: string) => {
    await apiRegister(userEmail, password, name);
    const { data } = await supabase.auth.getSession();
    applySession(data.session);
  }, [applySession]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_PASSKEY_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    invalidateCached("");
    applySession(null);
    supabase.auth.signOut().catch(() => {});
  }, [applySession]);

  const user = session?.user ?? null;
  const email = user?.email?.toLowerCase() ?? null;
  const fullName = (user?.user_metadata?.full_name as string | undefined) || (email ? email.split("@")[0] : null);

  return (
    <Ctx.Provider
      value={{
        token: session?.access_token ?? null,
        userId: user?.id ?? null,
        email,
        fullName,
        isLoggedIn: !!session,
        isLohith: checkLohithClearance(session),
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
