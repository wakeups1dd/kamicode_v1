"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function AuthPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-background p-4 animate-fade">
      <div className="w-full max-w-md bg-secondary-background border-4 border-black rounded-xl p-8 shadow-[8px_8px_0px_0px_#000]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">
            Join the <span className="text-main">Arena</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm">
            Sign in to access your problems, cohorts, and track your competitive coding streak.
          </p>
        </div>

        <div className="flex justify-center">
          <SignIn routing="hash" appearance={({ baseTheme: dark } as any)} />
        </div>
      </div>
    </div>
  );
}
