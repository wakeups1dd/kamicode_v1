import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12 max-w-4xl mx-auto space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black rounded-xl bg-secondary-background hover:bg-main hover:text-main-foreground font-black text-xs uppercase shadow-[3px_3px_0_0_#000] transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="bg-secondary-background border-4 border-black p-8 rounded-3xl shadow-[6px_6px_0_0_#000] space-y-6">
        <div className="flex items-center gap-3">
          <Lock className="w-8 h-8 text-[#8bd600]" />
          <h1 className="text-3xl font-black uppercase tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-xs font-bold text-muted-foreground">Effective Date: September 4, 2026</p>

        <section className="space-y-3">
          <h2 className="text-lg font-black uppercase tracking-tight">1. Information We Collect</h2>
          <p className="text-xs leading-relaxed font-medium text-foreground/90">
            We collect authentication data provided via Clerk (email address, username, display name, avatar) and technical telemetry (IP addresses, request logs, submissions, arena ratings, and solving streaks).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black uppercase tracking-tight">2. How We Use Information</h2>
          <p className="text-xs leading-relaxed font-medium text-foreground/90">
            Your data is used solely to maintain competitive programming leaderboards, evaluate code submissions, provide AI-powered complexity and code quality insights, and prevent cheating in multiplayer matches.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black uppercase tracking-tight">3. Data Security & GDPR Rights</h2>
          <p className="text-xs leading-relaxed font-medium text-foreground/90">
            We employ industry-standard encryption, tokenized JWKS verification, and strict sandboxing. You may request data deletion or account export at any time by contacting our support team.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black uppercase tracking-tight">4. Cookies & Analytics</h2>
          <p className="text-xs leading-relaxed font-medium text-foreground/90">
            We use essential session tokens and local storage preferences (such as preferred programming languages and themes) to provide an optimal coding experience.
          </p>
        </section>
      </div>
    </div>
  );
}
