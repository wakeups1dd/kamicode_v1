"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Sparkles, LogIn, UserPlus } from "lucide-react";

function AuthContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
    }
  }, [searchParams]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-background p-4 animate-fade">
      <div className="w-full max-w-lg bg-secondary-background border-4 border-black rounded-2xl p-6 sm:p-8 shadow-[8px_8px_0px_0px_#000]">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black bg-main text-main-foreground font-black text-xs uppercase tracking-wider mb-3 shadow-[2px_2px_0px_#000]">
            <Sparkles className="w-3.5 h-3.5" />
            KamiCode Arena
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2 tracking-tight">
            {mode === "signin" ? (
              <>Welcome back to the <span className="text-main">Arena</span></>
            ) : (
              <>Create your <span className="text-main">Developer Profile</span></>
            )}
          </h1>
          <p className="text-muted-foreground font-medium text-xs sm:text-sm">
            Authenticate with GitHub to track solves, maintain streaks, and battle in real-time PvP.
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-background border-2 border-black rounded-xl mb-6 shadow-[2px_2px_0px_#000]">
          <button
            onClick={() => setMode("signin")}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-black rounded-lg transition-all ${
              mode === "signin"
                ? "bg-main text-main-foreground border-2 border-black shadow-[2px_2px_0px_#000]"
                : "text-muted-foreground hover:text-foreground border-2 border-transparent"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-black rounded-lg transition-all ${
              mode === "signup"
                ? "bg-main text-main-foreground border-2 border-black shadow-[2px_2px_0px_#000]"
                : "text-muted-foreground hover:text-foreground border-2 border-transparent"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>

        <div className="flex justify-center overflow-x-auto">
          {mode === "signin" ? (
            <SignIn
              routing="hash"
              fallbackRedirectUrl="/"
              signUpUrl="/auth?mode=signup"
              appearance={{
                baseTheme: dark,
                elements: {
                  card: "bg-transparent shadow-none border-0 p-0",
                  rootBox: "w-full",
                },
              } as any}
            />
          ) : (
            <SignUp
              routing="hash"
              fallbackRedirectUrl="/"
              signInUrl="/auth"
              appearance={{
                baseTheme: dark,
                elements: {
                  card: "bg-transparent shadow-none border-0 p-0",
                  rootBox: "w-full",
                },
              } as any}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}

