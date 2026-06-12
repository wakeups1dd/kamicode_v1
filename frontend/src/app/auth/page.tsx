"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, Lock, User, Sparkles, ArrowRight, Code } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function AuthPage() {
  const { user, signIn, signUp, signInWithGithub, loading } = useAuth();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message || "Invalid email or password");
        } else {
          router.push("/");
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          setErrorMsg(error.message || "Failed to sign up");
        } else {
          setSuccessMsg("Account created! Please check your email for confirmation or try logging in.");
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
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
          
          {/* Header tabs */}
          <div className="flex border-b-2 border-black -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6 bg-zinc-100 dark:bg-zinc-900 rounded-t-lg">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-4 text-center font-black text-base border-r-2 border-black transition-all ${
                isLogin
                  ? "bg-white dark:bg-zinc-950 text-black dark:text-white"
                  : "text-zinc-500 hover:text-black dark:hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-4 text-center font-black text-base transition-all ${
                !isLogin
                  ? "bg-white dark:bg-zinc-950 text-black dark:text-white"
                  : "text-zinc-500 hover:text-black dark:hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          <h2 className="text-2xl font-black text-black dark:text-white mb-6">
            {isLogin ? "Welcome back!" : "Create your league account"}
          </h2>

          {/* Form Messages */}
          {errorMsg && (
            <div className="bg-red-100 dark:bg-red-950 border-2 border-red-500 dark:border-red-700 text-red-700 dark:text-red-300 p-3 rounded-lg font-mono text-xs font-bold mb-4 animate-shake">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-100 dark:bg-green-950 border-2 border-green-500 dark:border-green-700 text-green-700 dark:text-green-300 p-3 rounded-lg font-mono text-xs font-bold mb-4">
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="Alice Smith"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:bg-white dark:focus:bg-zinc-950"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:bg-white dark:focus:bg-zinc-950"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:bg-white dark:focus:bg-zinc-950"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full bg-[#a855f7] dark:bg-[#c084fc] text-black font-black py-3 px-4 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <span className="animate-pulse">Running...</span>
              ) : (
                <>
                  <span>{isLogin ? "Sign In" : "Register"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Separator */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-[2px] bg-black"></div>
            <span className="px-3 text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">
              Or Connect With
            </span>
            <div className="flex-1 h-[2px] bg-black"></div>
          </div>

          {/* GitHub Auth Button */}
          <button
            type="button"
            onClick={signInWithGithub}
            className="w-full bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-black dark:text-white font-black py-3 px-4 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <GithubIcon className="w-5 h-5 text-black dark:text-white" />
            <span>GitHub Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
