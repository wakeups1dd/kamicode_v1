import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function TermsPage() {
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
          <Shield className="w-8 h-8 text-main" />
          <h1 className="text-3xl font-black uppercase tracking-tight">Terms of Service</h1>
        </div>
        <p className="text-xs font-bold text-muted-foreground">Effective Date: September 4, 2026</p>

        <section className="space-y-3">
          <h2 className="text-lg font-black uppercase tracking-tight">1. Acceptance of Terms</h2>
          <p className="text-xs leading-relaxed font-medium text-foreground/90">
            By accessing or using KamiCode ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please discontinue use of the platform immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black uppercase tracking-tight">2. User Accounts & Fair Play</h2>
          <p className="text-xs leading-relaxed font-medium text-foreground/90">
            You are responsible for safeguarding your account credentials. You agree not to engage in malicious activities, including attempting Remote Code Execution (RCE), automated botting in PvP arenas, submitting plagiarized solutions during ranked contests, or abusing AI analysis rate limits.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black uppercase tracking-tight">3. Code Execution Sandbox</h2>
          <p className="text-xs leading-relaxed font-medium text-foreground/90">
            All code submitted to KamiCode runs in isolated sandbox environments. Attempts to probe, bypass, or exhaust server resources will result in immediate permanent account termination and potential legal escalation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black uppercase tracking-tight">4. Intellectual Property</h2>
          <p className="text-xs leading-relaxed font-medium text-foreground/90">
            You retain ownership of the original code you write. By submitting solutions on KamiCode, you grant us a license to compile, analyze, and display your public ranking, badges, and anonymized submission metrics.
          </p>
        </section>
      </div>
    </div>
  );
}
