"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, Check } from "lucide-react";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem("kamicode_cookie_consent");
      if (!consent) {
        setShow(true);
      }
    }
  }, []);

  const acceptCookies = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("kamicode_cookie_consent", "true");
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] bg-white dark:bg-[#191221] opacity-100 border-4 border-black p-5 rounded-2xl shadow-[6px_6px_0_0_#000] font-sans">
      <div className="flex items-start gap-3 mb-3">
        <Cookie className="w-6 h-6 text-[#ffbf00] flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-black uppercase tracking-tight text-foreground">Privacy & Cookie Notice</h4>
          <p className="text-[11px] font-semibold text-foreground/90 mt-1 leading-relaxed">
            KamiCode uses essential cookies and local storage for authentication and IDE preferences. Read our{" "}
            <Link href="/privacy" className="underline font-black text-main hover:opacity-80">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={acceptCookies}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-main text-main-foreground font-black text-xs uppercase border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer opacity-100"
        >
          <Check className="w-3.5 h-3.5" /> Got it!
        </button>
      </div>
    </div>
  );
}
