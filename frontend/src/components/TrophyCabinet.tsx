"use client";

import { useEffect, useState } from "react";
import { getAllBadges, getMyBadges } from "@/lib/api";
import type { BadgeResponse, UserBadgeResponse } from "@/lib/types";
import { Award, Flame, Trophy, Star, Crown, Swords } from "lucide-react";

export function TrophyCabinet() {
  const [allBadges, setAllBadges] = useState<BadgeResponse[]>([]);
  const [myBadges, setMyBadges] = useState<UserBadgeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBadges() {
      try {
        const [all, mine] = await Promise.all([
          getAllBadges().catch(() => []),
          getMyBadges().catch(() => [])
        ]);
        setAllBadges(all);
        setMyBadges(mine);
      } finally {
        setLoading(false);
      }
    }
    loadBadges();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]" />;
  }

  const earnedIds = new Set(myBadges.map(ub => ub.badge.id));

  const getIcon = (name: string, isEarned: boolean) => {
    const props = { className: `w-8 h-8 ${isEarned ? "text-main" : "text-zinc-400"}` };
    switch (name) {
      case "Swords": return <Swords {...props} />;
      case "Flame": return <Flame {...props} />;
      case "Trophy": return <Trophy {...props} />;
      case "Star": return <Star {...props} />;
      case "Crown": return <Crown {...props} />;
      default: return <Award {...props} />;
    }
  };

  return (
    <div className="border-4 border-black p-6 rounded-xl bg-secondary-background shadow-[4px_4px_0px_#000] select-none">
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-5 h-5 text-main fill-current" />
        <h3 className="font-mono font-black text-xs uppercase tracking-wider text-zinc-500">Trophy Cabinet</h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {allBadges.map(badge => {
          const isEarned = earnedIds.has(badge.id);
          
          return (
            <div 
              key={badge.id}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ${
                isEarned 
                  ? "border-main bg-main/10 shadow-[3px_3px_0px_#8bd600] scale-[1.02]" 
                  : "border-black bg-zinc-100 dark:bg-zinc-900 grayscale opacity-60 shadow-[3px_3px_0px_#000]"
              }`}
            >
              <div className="mb-3">
                {getIcon(badge.icon_name, isEarned)}
              </div>
              <div className={`font-black text-sm text-center mb-1 ${isEarned ? "text-foreground" : "text-zinc-500"}`}>
                {badge.name}
              </div>
              <div className="text-[9px] text-center font-mono font-bold text-zinc-500 leading-tight">
                {badge.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
