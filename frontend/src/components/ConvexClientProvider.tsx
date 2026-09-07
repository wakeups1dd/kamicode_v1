"use client";

import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://wry-tern-72.convex.cloud");

function UserSyncHandler() {
  const { user, isLoaded, isSignedIn } = useUser();
  const syncUser = useMutation(api.users.sync);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      if (syncedUserIdRef.current === user.id) return;

      const email = user.primaryEmailAddress?.emailAddress || "";
      const ghAccount = user.externalAccounts?.find(
        (acc: any) => acc.provider === "github" || acc.provider === "oauth_github"
      );
      const ghUsername = (ghAccount as any)?.username;
      const username =
        user.username ||
        ghUsername ||
        (email ? email.split("@")[0] : `user_${user.id.slice(-6)}`);
      const displayName =
        user.fullName ||
        user.firstName ||
        (ghUsername ? ghUsername : username);
      const avatarUrl = user.imageUrl || "";

      syncUser({
        userId: user.id,
        username,
        email,
        displayName,
        avatarUrl,
      })
        .then(() => {
          syncedUserIdRef.current = user.id;
        })
        .catch((err) => {
          console.warn("Failed to sync user to Convex:", err);
        });
    }
  }, [isLoaded, isSignedIn, user, syncUser]);

  return null;
}

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={({ baseTheme: dark } as any)}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserSyncHandler />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

