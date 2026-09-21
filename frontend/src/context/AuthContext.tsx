import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import { sendHeartbeat, sendOffline, sendOfflineBeacon } from "@/lib/api";

const isBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

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

  // Active user presence heartbeat & lifecycle
  useEffect(() => {
    if (!isSignedIn && !isBypass) return;

    // Send initial heartbeat
    sendHeartbeat().catch(() => {});

    // Periodic heartbeat every 25 seconds
    const interval = setInterval(() => {
      sendHeartbeat().catch(() => {});
    }, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleUnload = () => {
      sendOfflineBeacon();
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [isSignedIn]);

  const signUp = async () => {
    if (typeof window !== "undefined") window.location.href = "/auth?mode=signup";
    return { error: null };
  };
  const signIn = async () => {
    if (typeof window !== "undefined") window.location.href = "/auth";
    return { error: null };
  };
  const signInWithGithub = async () => {
    if (typeof window !== "undefined") window.location.href = "/auth";
  };
  const signInWithGoogle = async () => {
    if (typeof window !== "undefined") window.location.href = "/auth";
  };

  return (
    <AuthContext.Provider
      value={{
        user: isSignedIn ? user : (isBypass ? { id: "dev-user-id", username: "dev_user" } : null),
        session: sessionId ? { access_token: sessionId } : null,
        loading,
        signUp,
        signIn,
        signInWithGithub,
        signInWithGoogle,
        signOut: async () => {
          sendOffline().catch(() => {});
          await signOut();
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        },
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
