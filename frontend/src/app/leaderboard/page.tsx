"use client";

import { useEffect, useState, useRef } from "react";
import { getGlobalLeaderboard, getCohortLeaderboard, getMyCohorts } from "@/lib/api";

function CustomDropdown({
  value,
  onChange,
  options,
  labelPrefix = "",
  align = "left"
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  labelPrefix?: string;
  align?: "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left appearance-none bg-secondary-background border-2 border-black text-foreground rounded-xl pl-3.5 pr-9 py-2 text-xs font-black outline-none shadow-[2.5px_2.5px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-none transition-all"
      >
        {labelPrefix}{selectedOption?.label}
        <ChevronDown className={`w-4 h-4 text-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      
      {isOpen && (
        <div className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-2 min-w-full whitespace-nowrap max-h-[50vh] overflow-y-auto bg-secondary-background/90 backdrop-blur-md border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#000] z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100`}>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`text-left px-4 py-2.5 text-xs font-black border-b-2 border-black last:border-b-0 hover:bg-main hover:text-main-foreground transition-colors ${value === opt.value ? 'bg-main/20' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import { useAuth } from "@/context/AuthContext";
import type { LeaderboardEntry, CohortResponse } from "@/lib/types";
import { Trophy, Users, Award, Zap, Code, ShieldAlert, Sparkles, ChevronDown } from "lucide-react";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cohorts, setCohorts] = useState<CohortResponse[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<CohortResponse | null>(null);
  const [isGlobal, setIsGlobal] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [globalData, cohortsData] = await Promise.all([
          getGlobalLeaderboard(),
          getMyCohorts().catch(() => [])
        ]);
        setLeaderboard(globalData);
        setCohorts(cohortsData);
        if (cohortsData.length > 0) {
          setSelectedCohort(cohortsData[0]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load leaderboard data.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Fetch leaderboard when category changes
  const handleToggle = async (global: boolean) => {
    setIsGlobal(global);
    setLoading(true);
    setError(null);
    try {
      if (global) {
        const data = await getGlobalLeaderboard();
        setLeaderboard(data);
      } else if (selectedCohort) {
        const data = await getCohortLeaderboard(selectedCohort.id);
        setLeaderboard(data);
      } else {
        setLeaderboard([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load leaderboard data.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch leaderboard when cohort selector changes
  const handleCohortChange = async (cohortId: number) => {
    const cohort = cohorts.find(c => c.id === cohortId) || null;
    setSelectedCohort(cohort);
    if (!isGlobal && cohort) {
      setLoading(true);
      setError(null);
      try {
        const data = await getCohortLeaderboard(cohort.id);
        setLeaderboard(data);
      } catch (err: any) {
        setError(err.message || "Failed to load cohort rankings.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper for rank medallions/numbers
  const renderRankMedal = (rank: number) => {
    if (rank === 1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-black bg-yellow-400 font-bold text-xs shadow-[1px_1px_0px_#000]">🥇</span>;
    if (rank === 2) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-black bg-zinc-300 font-bold text-xs shadow-[1px_1px_0px_#000]">🥈</span>;
    if (rank === 3) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-black bg-amber-600 text-white font-bold text-xs shadow-[1px_1px_0px_#000]">🥉</span>;
    return <span className="font-mono text-zinc-500 font-bold">#0{rank}</span>;
  };

  return (
    <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
      {/* Header section */}
      <div className="bg-secondary-background border-b-4 border-black py-7 px-6 sm:px-8">
        <div className="max-w-[1000px] mx-auto space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono font-bold">
            <span>League</span>
            <span>/</span>
            <span className="text-foreground font-black hover:underline cursor-pointer">leaderboard</span>
            <span className="text-[9px] px-2 py-0.5 rounded-xl border-2 border-black bg-main text-main-foreground font-black uppercase tracking-wider">
              rankings
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span>Coding League <span className="text-main">Standings</span></span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Tackle daily problems, build consecutive streaks, and climb the arena rankings.
          </p>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-6">
        
        {/* Navigation / Selectors */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          {/* Tabs */}
          <div className="flex bg-secondary-background border-2 border-black p-1 rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] w-full sm:w-auto">
            <button
              onClick={() => handleToggle(true)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${
                isGlobal
                  ? "bg-main text-main-foreground border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
                  : "text-zinc-500 hover:text-black dark:hover:text-white"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Global</span>
            </button>
            <button
              onClick={() => handleToggle(false)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${
                !isGlobal
                  ? "bg-main text-main-foreground border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
                  : "text-zinc-500 hover:text-black dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>My Cohort</span>
            </button>
          </div>

          {/* Cohort Selector (only visible for Cohort Leaderboard) */}
          {!isGlobal && (
            <div className="relative w-full sm:w-64">
              {cohorts.length > 0 ? (
                <CustomDropdown
                  value={selectedCohort?.id.toString() || ""}
                  onChange={(val) => handleCohortChange(Number(val))}
                  options={cohorts.map((c) => ({ value: c.id.toString(), label: c.name }))}
                  labelPrefix="League: "
                />
              ) : (
                <div className="text-xs font-mono font-bold text-zinc-500 bg-secondary-background border-2 border-black p-2.5 rounded-2xl">
                  ⚠️ No cohorts joined yet.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Leaderboard Table Card */}
        <div className="bg-secondary-background border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] overflow-hidden">
          
          {/* Header */}
          <div className="bg-main border-b-4 border-black px-5 py-4 flex items-center justify-between">
            <span className="font-mono font-black text-xs uppercase tracking-wider text-main-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{isGlobal ? "Global Arena Leaderboard" : `${selectedCohort?.name || "Cohort"} Rankings`}</span>
            </span>
            <span className="font-mono text-[10px] font-bold bg-white dark:bg-zinc-900 border-2 border-black px-2 py-0.5 rounded text-black dark:text-white">
              Sorted by Solves
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 bg-background/30 gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
              <span className="text-xs font-mono font-bold text-muted-foreground">Loading standings...</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
              <ShieldAlert className="w-10 h-10 text-red-500" />
              <span className="text-sm font-bold text-red-500">Failed to fetch leaderboard: {error}</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && leaderboard.length === 0 && (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
              <Users className="w-12 h-12 text-zinc-400" />
              <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">No participants found in this league.</span>
              <p className="text-xs text-zinc-500 font-mono">Solve a problem or invite members to join!</p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && leaderboard.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-mono font-black text-[10px] uppercase select-none">
                    <th className="py-3 px-5 text-center w-16">Rank</th>
                    <th className="py-3 px-5">Developer</th>
                    <th className="py-3 px-5 text-center w-24">Solved</th>
                    <th className="py-3 px-5 text-center w-24">Current Streak</th>
                    <th className="py-3 px-5 text-center w-24">Max Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {leaderboard.map((row) => {
                    const isCurrentUser = user && row.user_id === user.id;
                    const avatarInit = (row.display_name || row.username || "?").charAt(0).toUpperCase();

                    return (
                      <tr
                        key={row.user_id}
                        className={`transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${
                          isCurrentUser ? "bg-purple-100/30 dark:bg-purple-900/10 font-bold" : ""
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-5 text-center font-bold">
                          {renderRankMedal(row.rank)}
                        </td>

                        {/* Developer */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            {row.avatar_url ? (
                              <img
                                src={row.avatar_url}
                                alt={row.username}
                                className="w-8 h-8 rounded-full border-2 border-black object-cover shadow-[1.5px_1.5px_0px_#000]"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full border-2 border-black bg-purple-300 dark:bg-purple-700 flex items-center justify-center font-mono font-black text-xs text-black shadow-[1.5px_1.5px_0px_#000]">
                                {avatarInit}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-sm truncate flex items-center gap-1.5">
                                <span className="text-foreground">{row.display_name || row.username}</span>
                                {isCurrentUser && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-black bg-main text-main-foreground font-black uppercase tracking-wider scale-90">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono font-medium truncate">
                                @{row.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Solved Problems */}
                        <td className="py-4 px-5 text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black bg-zinc-50 dark:bg-zinc-900 shadow-[1.5px_1.5px_0px_#000] font-mono font-black text-xs text-foreground">
                            <Code className="w-3.5 h-3.5 text-[#a855f7] dark:text-[#c084fc]" />
                            <span>{row.total_solves}</span>
                          </div>
                        </td>

                        {/* Current Streak */}
                        <td className="py-4 px-5 text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-black bg-[#ffbf00]/15 dark:bg-[#ffbf00]/5 text-[#ffbf00] font-mono font-black text-xs">
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>{row.current_streak}d</span>
                          </div>
                        </td>

                        {/* Max Streak */}
                        <td className="py-4 px-5 text-center font-mono font-bold text-xs text-zinc-600 dark:text-zinc-400">
                          {row.longest_streak}d
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
