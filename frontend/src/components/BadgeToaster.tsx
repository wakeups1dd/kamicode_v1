"use client";

import { useEffect, useState } from "react";
import { getMyBadges } from "@/lib/api";
import { Award, Flame, Trophy, Star, Crown, Swords, X } from "lucide-react";
import type { UserBadgeResponse } from "@/lib/types";

export function BadgeToaster() {
  const [toasts, setToasts] = useState<UserBadgeResponse[]>([]);

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

  const getIcon = (name: string) => {
    const props = { className: "w-10 h-10 text-main fill-current" };
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((tb) => (
        <div key={tb.id} className="animate-fade bg-secondary-background border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_#000] w-80 relative select-none">
          <button 
            onClick={() => removeToast(tb.id)}
            className="absolute top-2 right-2 text-zinc-400 hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-main/10 p-2 rounded-lg border-2 border-main">
              {getIcon(tb.badge.icon_name)}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase font-mono text-main mb-0.5">Badge Unlocked!</div>
              <div className="font-black text-sm text-foreground leading-tight">{tb.badge.name}</div>
              <div className="text-[10px] font-mono text-zinc-500 leading-tight mt-1">{tb.badge.description}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
