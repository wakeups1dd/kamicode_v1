"use client";

import { use, Suspense } from "react";
import { ProfileContent } from "../page";

export default function UserProfileDynamicPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
            <span className="text-xs font-mono font-bold text-muted-foreground">
              Loading developer profile...
            </span>
          </div>
        </div>
      }
    >
      <ProfileContent initialUsername={username} />
    </Suspense>
  );
}
