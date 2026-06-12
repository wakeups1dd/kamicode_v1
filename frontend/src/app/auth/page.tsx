"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Code } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthPage() {
  const { user, signInWithGithub, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setActionLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || "Google authentication failed.");
      setActionLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setErrorMsg("");
    setActionLoading(true);
    try {
      await signInWithGithub();
    } catch (err: any) {
      setErrorMsg(err?.message || "GitHub authentication failed.");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#e2d4f7] dark:bg-[#1e132c]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-purple-500 shadow-md"></div>
          <p className="text-black dark:text-white font-mono font-bold animate-pulse text-lg">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center bg-[#e2d4f7] dark:bg-[#1e132c] p-4 gap-8 md:gap-16 select-none font-sans relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-400/20 dark:bg-violet-600/10 blur-3xl pointer-events-none" />

      {/* Brand Section */}
      <div className="flex flex-col max-w-md text-left z-10 p-2">
        <div className="inline-flex items-center gap-3 bg-white dark:bg-zinc-900 border-2 border-black px-4 py-2 rounded-lg shadow-[4px_4px_0px_0px_#000000] w-fit mb-6 rotate-[-2deg]">
          <Code className="w-8 h-8 text-[#a855f7] dark:text-[#c084fc]" />
          <span className="font-mono font-black text-2xl tracking-tighter text-black dark:text-white">
            KamiCode
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-black dark:text-white mb-4">
          CODE LEAGUES FOR THE <span className="underline decoration-wavy decoration-[#a855f7] dark:decoration-[#c084fc] decoration-2">NEXT GEN</span>.
        </h1>
        <p className="text-zinc-700 dark:text-zinc-300 font-medium text-lg mb-6 leading-relaxed">
          Prove your actual coding skills in private collegiate coding leagues. Build streaks, tackle daily DSA, compete live, and receive automated deep AI evaluations.
        </p>

        {/* Feature Checkpoints */}
        <div className="flex flex-col gap-3 font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200">
          <div className="flex items-center gap-2">
            <span className="text-[#a855f7] dark:text-[#c084fc]">⚡</span>
            <span>Local Python Executor — No Paid Keys</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#a855f7] dark:text-[#c084fc]">⚡</span>
            <span>Intelligent AI Feedback Coach</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#a855f7] dark:text-[#c084fc]">⚡</span>
            <span>Interactive Cohorts & Live Leaderboards</span>
          </div>
        </div>
      </div>

      {/* Auth Card Section */}
      <div className="w-full max-w-md z-10 transition-all duration-300 hover:rotate-[0.5deg]">
        <div className="bg-white dark:bg-zinc-950 border-4 border-black rounded-xl p-6 md:p-8 shadow-[8px_8px_0px_0px_#000000] relative">
          
          <h2 className="text-2xl font-black text-black dark:text-white mb-2">
            Sign In / Register
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium text-sm mb-6">
            Join the coding league. Sign up or log in instantly using one of the secure OAuth providers below.
          </p>

          {/* Form Messages */}
          {errorMsg && (
            <div className="bg-red-100 dark:bg-red-950 border-2 border-red-500 dark:border-red-700 text-red-700 dark:text-red-300 p-3 rounded-lg font-mono text-xs font-bold mb-4 animate-shake">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            {/* Google Auth Button */}
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleGoogleSignIn}
              className="w-full bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-black dark:text-white font-black py-3 px-4 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              <GoogleIcon className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>

            {/* GitHub Auth Button */}
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleGithubSignIn}
              className="w-full bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-black dark:text-white font-black py-3 px-4 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              <GithubIcon className="w-5 h-5 text-black dark:text-white" />
              <span>Continue with GitHub</span>
            </button>
          </div>

          <div className="mt-8 pt-4 border-t-2 border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
              Secure authentication powered by Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

