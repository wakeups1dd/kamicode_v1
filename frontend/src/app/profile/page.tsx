"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { listMySubmissions, listProblems, getMyStreak } from "@/lib/api";
import type { SubmissionResponse, ProblemSummary, UserStreakResponse } from "@/lib/types";
import Link from "next/link";
import { User, Zap, Code, ShieldAlert, Award, Calendar, ExternalLink, Activity, AwardIcon } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [problemMap, setProblemMap] = useState<Record<number, ProblemSummary>>({});
  const [streak, setStreak] = useState<UserStreakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [subsData, problemsData, streakData] = await Promise.all([
          listMySubmissions().catch(() => []),
          listProblems().catch(() => []),
          getMyStreak().catch(() => null)
        ]);

        setSubmissions(subsData);
        setStreak(streakData);

        const pMap: Record<number, ProblemSummary> = {};
        problemsData.forEach((p) => {
          pMap[p.id] = p;
        });
        setProblemMap(pMap);
      } catch (err: any) {
        setError(err.message || "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
          <span className="text-xs font-mono font-bold text-muted-foreground">Loading developer profile...</span>
        </div>
      </div>
    );
  }

  // Compute solve metrics
  const acceptedSubmissions = submissions.filter(s => s.status === "accepted");
  
  // Unique solved problem IDs
  const solvedProblemIds = new Set(acceptedSubmissions.map(s => s.problem_id));
  const totalSolvedCount = solvedProblemIds.size;

  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  solvedProblemIds.forEach(id => {
    const prob = problemMap[id];
    if (prob) {
      if (prob.difficulty === "easy") easySolved++;
      if (prob.difficulty === "medium") mediumSolved++;
      if (prob.difficulty === "hard") hardSolved++;
    }
  });

  const getVerdictBadge = (status: string) => {
    const config: Record<string, { label: string; bg: string }> = {
      accepted: { label: "Accepted", bg: "bg-[#8bd600] text-black" },
      wrong_answer: { label: "Wrong Answer", bg: "bg-[#f85149] text-white" },
      time_limit_exceeded: { label: "TLE", bg: "bg-[#ffbf00] text-black" },
      runtime_error: { label: "Runtime Error", bg: "bg-[#f85149] text-white" },
      compilation_error: { label: "Compilation Error", bg: "bg-[#f85149] text-white" },
    };

    const c = config[status] || { label: status.toUpperCase(), bg: "bg-zinc-500 text-white" };
    return (
      <span className={`px-2 py-0.5 rounded-[4px] border border-black font-mono font-black text-[9px] uppercase shadow-[1px_1px_0px_#000] ${c.bg}`}>
        {c.label}
      </span>
    );
  };

  const username = user?.email?.split("@")[0] || "coder";
  const displayName = user?.user_metadata?.display_name || username.charAt(0).toUpperCase() + username.slice(1);
  const avatarInit = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
      {/* Header section */}
      <div className="bg-secondary-background border-b-4 border-black py-7 px-6 sm:px-8">
        <div className="max-w-[1000px] mx-auto space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono font-bold">
            <span>User</span>
            <span>/</span>
            <span className="text-foreground font-black hover:underline cursor-pointer">profile</span>
            <span className="text-[9px] px-2 py-0.5 rounded-[4px] border-2 border-black bg-main text-main-foreground font-black uppercase tracking-wider">
              developer
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <User className="w-6 h-6 text-main" />
            <span>Developer <span className="text-main">Profile</span></span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Review solve distributions, streak statistics, and historical code submission logs.
          </p>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-8">
        
        {error && (
          <div className="p-4 bg-red-500/10 border-2 border-black rounded-lg text-red-500 text-xs font-bold text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Profile Card & Streak Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main User Card */}
          <div className="bg-secondary-background border-4 border-black p-6 rounded-xl shadow-[4px_4px_0px_#000] flex flex-col items-center justify-center text-center gap-4 select-none">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={username}
                className="w-20 h-20 rounded-full border-4 border-black shadow-[3px_3px_0px_#000]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-black bg-purple-300 dark:bg-purple-700 flex items-center justify-center font-mono font-black text-3xl text-black shadow-[3px_3px_0px_#000]">
                {avatarInit}
              </div>
            )}

            <div>
              <h2 className="text-xl font-black text-foreground">{displayName}</h2>
              <p className="text-xs text-zinc-500 font-mono">@{username}</p>
            </div>

            <div className="w-full border-t border-black pt-3 flex flex-col gap-1.5 font-mono text-[10px] text-zinc-500 font-bold">
              <div className="flex justify-between">
                <span>Account Email:</span>
                <span className="text-foreground truncate max-w-[150px]">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span>Member Since:</span>
                <span className="text-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats & Streak Box */}
          <div className="border-4 border-black p-6 rounded-xl bg-secondary-background shadow-[4px_4px_0px_#000] flex flex-col justify-between select-none">
            <div className="space-y-4">
              <h3 className="font-mono font-black text-xs uppercase tracking-wider text-zinc-500">Solve Streaks</h3>
              
              <div className="flex items-center justify-between border-2 border-black p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-[#ffbf00] fill-current" />
                  <div>
                    <div className="text-[9px] uppercase font-black text-zinc-500">Current Streak</div>
                    <div className="font-mono font-black text-xl text-foreground">
                      {streak?.current_streak || 0} days
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-2 border-black p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-main" />
                  <div>
                    <div className="text-[9px] uppercase font-black text-zinc-500">Longest Streak</div>
                    <div className="font-mono font-black text-xl text-foreground">
                      {streak?.longest_streak || 0} days
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground font-mono leading-tight mt-4">
              Solve at least one coding challenge daily to maintain and compound your hot streak!
            </div>
          </div>

          {/* Solve breakdown */}
          <div className="border-4 border-black p-6 rounded-xl bg-secondary-background shadow-[4px_4px_0px_#000] space-y-4 select-none">
            <h3 className="font-mono font-black text-xs uppercase tracking-wider text-zinc-500">DSA Solve Metrics</h3>
            
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-main">{totalSolvedCount}</span>
              <span className="text-[10px] uppercase font-black text-zinc-400">Total Solved</span>
            </div>

            <div className="space-y-3 font-mono font-black text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8bd600]">EASY</span>
                  <span className="text-foreground">{easySolved} solved</span>
                </div>
                <div className="w-full h-2 border border-black rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="bg-[#8bd600] h-full" style={{ width: `${totalSolvedCount > 0 ? (easySolved / totalSolvedCount) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#ffbf00]">MEDIUM</span>
                  <span className="text-foreground">{mediumSolved} solved</span>
                </div>
                <div className="w-full h-2 border border-black rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="bg-[#ffbf00] h-full" style={{ width: `${totalSolvedCount > 0 ? (mediumSolved / totalSolvedCount) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#f85149]">HARD</span>
                  <span className="text-foreground">{hardSolved} solved</span>
                </div>
                <div className="w-full h-2 border border-black rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="bg-[#f85149] h-full" style={{ width: `${totalSolvedCount > 0 ? (hardSolved / totalSolvedCount) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Historical Submissions Logs */}
        <div className="bg-secondary-background border-4 border-black rounded-xl shadow-[4px_4px_0px_#000] overflow-hidden">
          
          <div className="bg-main border-b-4 border-black px-5 py-4 flex items-center justify-between">
            <span className="font-mono font-black text-xs uppercase tracking-wider text-main-foreground flex items-center gap-1.5 select-none">
              <Activity className="w-4 h-4" />
              <span>Historical Submission Logs</span>
            </span>
            <span className="font-mono text-[10px] font-bold bg-white dark:bg-zinc-900 border-2 border-black px-2 py-0.5 rounded text-black dark:text-white">
              {submissions.length} Total Attempts
            </span>
          </div>

          {submissions.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-2 select-none">
              <Code className="w-10 h-10 text-zinc-400" />
              <span className="text-sm font-bold text-zinc-500">No submissions found.</span>
              <p className="text-xs text-zinc-400 font-mono">Solve a challenge to start logs!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-mono font-black text-[10px] uppercase select-none">
                    <th className="py-3 px-5">Problem Challenge</th>
                    <th className="py-3 px-5 text-center w-28">Verdict</th>
                    <th className="py-3 px-5 text-center w-24">Runtime</th>
                    <th className="py-3 px-5 text-center w-24">Language</th>
                    <th className="py-3 px-5 text-center w-36">Timestamp</th>
                    <th className="py-3 px-5 text-center w-16">Arena</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {submissions.map((sub) => {
                    const prob = problemMap[sub.problem_id];
                    const probTitle = prob?.title || `Problem ID: ${sub.problem_id}`;
                    const probSlug = prob?.slug;

                    return (
                      <tr key={sub.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/30 text-xs font-bold transition-colors">
                        
                        {/* Title / Problem */}
                        <td className="py-3.5 px-5">
                          {probSlug ? (
                            <Link href={`/problems/${probSlug}`} className="hover:text-main hover:underline flex items-center gap-1">
                              <span>{probTitle}</span>
                            </Link>
                          ) : (
                            <span>{probTitle}</span>
                          )}
                        </td>

                        {/* Verdict */}
                        <td className="py-3.5 px-5 text-center">
                          {getVerdictBadge(sub.status)}
                        </td>

                        {/* Runtime */}
                        <td className="py-3.5 px-5 text-center font-mono">
                          {sub.runtime_ms != null ? `${sub.runtime_ms}ms` : "—"}
                        </td>

                        {/* Language */}
                        <td className="py-3.5 px-5 text-center font-mono uppercase text-[10px] text-zinc-600 dark:text-zinc-400">
                          {sub.language}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-5 text-center font-mono text-zinc-500 font-medium">
                          {sub.created_at ? new Date(sub.created_at).toLocaleString() : "—"}
                        </td>

                        {/* Link to code */}
                        <td className="py-3.5 px-5 text-center">
                          {probSlug ? (
                            <Link href={`/problems/${probSlug}`} className="inline-flex items-center text-main hover:text-main/80" title="Go to arena">
                              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                            </Link>
                          ) : (
                            <span>—</span>
                          )}
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
