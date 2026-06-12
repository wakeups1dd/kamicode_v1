"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

/* ─── Types ─────────────────────────────────────────── */

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGithub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const isBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

const getMockToken = () => {
  const payload = {
    sub: "dev-user-id",
    email: "dev@kamicode.local",
    user_metadata: {
      display_name: "Dev User",
    },
  };
  const str = JSON.stringify(payload);
  const base64 = typeof window !== "undefined"
    ? btoa(str)
    : Buffer.from(str).toString("base64");
  const base64Url = base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Url}.mock_signature`;
};

const getMockUser = (): User => ({
  id: "dev-user-id",
  email: "dev@kamicode.local",
  app_metadata: {},
  user_metadata: {
    display_name: "Dev User",
  },
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date().toISOString(),
} as User);

const getMockSession = (): Session => ({
  access_token: getMockToken(),
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user: getMockUser(),
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ─── Provider ──────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to sync session to cookies for middleware
  const updateAuthCookie = (currSession: Session | null) => {
    if (typeof window === "undefined") return;
    if (currSession) {
      document.cookie = `sb-access-token=${currSession.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
    } else {
      document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure`;
    }
  };

  // Initialize session on mount
  useEffect(() => {
    if (isBypass) {
      const mockSession = getMockSession();
      setSession(mockSession);
      setUser(mockSession.user);
      updateAuthCookie(mockSession);
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        updateAuthCookie(currentSession);
      } catch {
        // Supabase not configured — allow app to work without auth
        console.warn("Auth initialization skipped — Supabase not configured.");
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      updateAuthCookie(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (isBypass) {
        return { error: null };
      }
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) return { error: error as unknown as Error };
        return { error: null };
      } catch (err) {
        return { error: err as Error };
      }
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    if (isBypass) {
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error as unknown as Error };
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signInWithGithub = useCallback(async () => {
    if (isBypass) {
      window.location.href = "/";
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/` },
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (isBypass) {
      window.location.href = "/";
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (isBypass) {
      setUser(null);
      setSession(null);
      updateAuthCookie(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGithub,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ─── Hook ──────────────────────────────────────────── */

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
