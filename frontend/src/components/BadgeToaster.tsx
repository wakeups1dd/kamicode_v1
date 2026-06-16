"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyBadges } from "@/lib/api";
import { Award, Flame, Trophy, Star, Crown, Swords, X } from "lucide-react";
import type { UserBadgeResponse } from "@/lib/types";

export function BadgeToaster() {
  const [toasts, setToasts] = useState<UserBadgeResponse[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Only run if user is logged in. 
    // We poll every 5 seconds to see if any new badges were unlocked.
    let interval = setInterval(async () => {
      try {
        const badges = await getMyBadges();
        const storedIds = JSON.parse(localStorage.getItem("seen_badges") || "[]");
        
        const newBadges = badges.filter(b => !storedIds.includes(b.badge.id));
        
        if (newBadges.length > 0) {
          setToasts(prev => [...prev, ...newBadges]);
          
          const newIds = [...storedIds, ...newBadges.map(b => b.badge.id)];
          localStorage.setItem("seen_badges", JSON.stringify(newIds));

          // Auto dismiss each new badge after 5 seconds
          newBadges.forEach(b => {
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== b.id));
            }, 5000);
          });
        }
      } catch (err) {
        // ignore if not logged in
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleAwesomeClick = (id: number) => {
    removeToast(id);
    router.push("/profile");
  };

  const getIcon = (name: string, customClass: string = "w-10 h-10 text-main fill-current") => {
    const props = { className: customClass };
    switch (name) {
      case "Swords": return <Swords {...props} />;
      case "Flame": return <Flame {...props} />;
      case "Trophy": return <Trophy {...props} />;
      case "Star": return <Star {...props} />;
      case "Crown": return <Crown {...props} />;
      default: return <Award {...props} />;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade">
      {toasts.map((tb, index) => (
        <div 
          key={tb.id} 
          className="absolute bg-white/70 dark:bg-[#191221]/70 backdrop-blur-md border-4 border-black p-8 rounded-2xl shadow-[8px_8px_0px_#000] w-[90%] max-w-sm text-center flex flex-col items-center animate-slide-up"
          style={{ zIndex: 50 + index }}
        >
          <button 
            onClick={() => removeToast(tb.id)}
            className="absolute top-4 right-4 text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex-shrink-0 bg-main/20 p-6 rounded-full border-4 border-main mb-6 transform hover:scale-110 transition-transform duration-300 shadow-[4px_4px_0px_#000]">
            {getIcon(tb.badge.icon_name, "w-24 h-24 text-main fill-current")}
          </div>
          
          <div className="text-xs font-black uppercase font-mono text-main mb-2 tracking-widest bg-main/10 px-3 py-1 rounded-full border-2 border-main">
            Badge Unlocked!
          </div>
          <div className="font-black text-3xl text-foreground leading-tight mb-3">
            {tb.badge.name}
          </div>
          <div className="text-sm font-mono text-foreground/70 leading-relaxed mb-6 font-bold">
            {tb.badge.description}
          </div>
          
          <button 
            onClick={() => handleAwesomeClick(tb.id)}
            className="w-full py-3 bg-main text-main-foreground font-black font-mono border-2 border-black rounded-2xl hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000] active:translate-y-0 active:shadow-none transition-all uppercase tracking-wide"
          >
            Awesome!
          </button>
        </div>
      ))}
    </div>
  );
}
