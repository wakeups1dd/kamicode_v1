"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";

/* ─── Types ─────────────────────────────────────────── */

interface AuthContextType {
  user: any;
  session: any;
  loading: boolean;
  signOut: () => Promise<void>;
  // Mock implementations for legacy calls
  signUp: () => Promise<{ error: Error | null }>;
  signIn: () => Promise<{ error: Error | null }>;
  signInWithGithub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ─── Provider ──────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { sessionId } = useClerkAuth();
  const { signOut } = useClerk();

  const loading = !isLoaded;

  // Legacy mock methods (Auth page now uses <SignIn /> directly)
  const signUp = async () => ({ error: null });
  const signIn = async () => ({ error: null });
  const signInWithGithub = async () => {};
  const signInWithGoogle = async () => {};

  return (
    <AuthContext.Provider
      value={{
        user: isSignedIn ? user : null,
        session: sessionId ? { access_token: sessionId } : null,
        loading,
        signUp,
        signIn,
        signInWithGithub,
        signInWithGoogle,
        signOut: async () => { await signOut(); },
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
