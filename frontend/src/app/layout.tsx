import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/context/AuthContext";
import { BadgeToaster } from "@/components/BadgeToaster";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KamiCode",
  description: "Prove how well you code, not just how much you code. AI-native competitive programming.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex overflow-hidden overflow-x-hidden">
        <ConvexClientProvider>
          <AuthProvider>
            <Sidebar />
            <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
            <BadgeToaster />
          </AuthProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
