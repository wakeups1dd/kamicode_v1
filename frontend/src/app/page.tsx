"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { listProblems, getMyStreak, listMySubmissions, getGlobalDailyChallenge, type GlobalDailyChallengeResponse } from "@/lib/api";
import type { ProblemSummary, SubmissionResponse, UserStreakResponse } from "@/lib/types";
import {
  GitCommit,
  GitPullRequest,
  GitBranch,
  Flame,
  Trophy,
  Star,
  Play,
  Award,
  Code,
  User,
  Calendar,
  BookOpen,
  Sparkles,
  Terminal,
  Plus,
  Swords,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
} from "lucide-react";

/* ── Contribution Calendar Component ────────────────────────── */

function ContributionCalendar({ submissions }: { submissions: SubmissionResponse[] }) {
  const [tiles, setTiles] = useState<{ id: number; level: number; dateStr: string; count: number }[]>([]);
  const [months, setMonths] = useState<{ label: string; colIndex: number }[]>([]);

  useEffect(() => {
    // Generate 371 grid tiles (53 weeks * 7 days)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const generated: { id: number; level: number; dateStr: string; count: number }[] = [];
    const monthLabels: { label: string; colIndex: number }[] = [];
    
    for (let i = 0; i < 371; i++) {
      const d = new Date(today.getTime());
      d.setDate(d.getDate() - (370 - i));
      
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      
      if (d.getDate() === 1) {
        const colIndex = Math.floor(i / 7);
        monthLabels.push({ label: d.toLocaleDateString("en-US", { month: "short" }), colIndex });
      }
      
      generated.push({ id: i, level: 0, count: 0, dateStr });
    }
    
    // Fill in activity based on actual submission history
    submissions.forEach(sub => {
      if (!sub.created_at) return;
      const subDate = new Date(sub.created_at);
      const diffTime = today.getTime() - subDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < 371) {
        const tileIdx = 370 - diffDays;
        if (tileIdx >= 0 && tileIdx < 371) {
          generated[tileIdx].count += 1;
          // Increment level, accepted solves count more
          const increment = sub.status === "accepted" ? 2 : 1;
          generated[tileIdx].level = Math.min(4, generated[tileIdx].level + increment);
        }
      }
    });

    setTiles(generated);
    
    // Filter months to avoid overlapping labels
    const filteredMonths = monthLabels.filter((m, i, arr) => {
      if (i === 0) return true;
      return m.colIndex - arr[i-1].colIndex > 2; // At least 2 columns apart
    });
    setMonths(filteredMonths);
  }, [submissions]);

  // Purple theme levels
  const levelColors = [
    "bg-background border border-black/10 dark:border-black/30", // Level 0
    "bg-[#ebd5ff] border border-black/20", // Level 1: Light Purple
    "bg-[#d8b4fe] border border-black/40", // Level 2: Medium Purple
    "bg-[#a855f7] border border-black/60", // Level 3: Main Purple
    "bg-[#6b21a8] border border-black",    // Level 4: Dark Purple
  ];

  const totalSolvedInYear = new Set(
    submissions.filter(s => s.status === "accepted").map(s => s.problem_id)
  ).size;

  return (
    <div className="git-card p-5 animate-slide-up select-none overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-1">
        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>Contributions & Solves</span>
        </h3>
        <span className="text-xs text-muted-foreground font-mono font-bold">
          {totalSolvedInYear} unique solved challenges
        </span>
      </div>

      <div className="flex flex-col overflow-x-auto py-1">
        {/* Month Labels */}
        <div className="relative h-4 w-full ml-[30px] mb-1 text-[10px] text-muted-foreground font-mono font-bold">
          {months.map((m, idx) => (
            <span key={idx} className="absolute" style={{ left: `${m.colIndex * 13}px` }}>
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-2 items-start justify-start w-max">
          {/* Day-of-week indicators */}
          <div className="grid grid-rows-7 gap-[3px] text-[9px] text-muted-foreground pt-[1px] pr-1 font-mono font-bold">
            <span>Mon</span>
            <span className="invisible">Tue</span>
            <span>Wed</span>
            <span className="invisible">Thu</span>
            <span>Fri</span>
            <span className="invisible">Sat</span>
            <span className="invisible">Sun</span>
          </div>

          {/* 53 Columns of 7 Rows */}
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
            {tiles.map((tile) => (
              <div
                key={tile.id}
                className={`w-[10px] h-[10px] rounded-[2px] transition-all hover:scale-150 hover:ring-2 hover:ring-black hover:z-10 cursor-pointer ${levelColors[tile.level]}`}
                title={tile.count > 0 ? `${tile.count} submissions on ${tile.dateStr}` : `No activity on ${tile.dateStr}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground mt-3 font-mono font-bold">
        <span>Less</span>
        <span className="w-2.5 h-2.5 rounded-[1px] bg-background border border-black/20" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#ebd5ff] border border-black/20" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#d8b4fe] border border-black/40" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#a855f7] border border-black/60" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#6b21a8] border border-black" />
        <span>More</span>
      </div>
    </div>
  );
}

/* ── Git Timeline Component ────────────────────────────────── */

function formatRelativeTime(dateInput?: string | number | null): string {
  if (!dateInput) return "Recently";
  const d = new Date(dateInput);
  const diff = Date.now() - d.getTime();
  if (isNaN(diff) || diff < 0) return "Just now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface TimelineProps {
  submissions: SubmissionResponse[];
  problemMap: Record<string, ProblemSummary>;
}

function GitTimeline({
  submissions,
  problemMap,
}: {
  submissions: SubmissionResponse[];
  problemMap: Record<string, ProblemSummary>;
}) {
  const [filterMode, setFilterMode] = useState<"all" | "solves">("all");

  // Sort submissions strictly newest-first by timestamp
  const sortedSubmissions = [...submissions].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });

  const totalAcceptedCount = sortedSubmissions.filter((s) => s.status === "accepted").length;

  const filteredSubmissions = sortedSubmissions.filter((sub) => {
    if (filterMode === "solves") {
      return sub.status === "accepted";
    }
    return true;
  });

  const recentCommits = filteredSubmissions.slice(0, 5).map((sub) => {
    const prob =
      problemMap[String(sub.problem_id)] ||
      problemMap[String((sub as any).problemId)] ||
      problemMap[String((sub as any).problem_slug)];

    const title = prob?.title || (sub.problem_id ? `Problem #${String(sub.problem_id).slice(-6)}` : "Coding Challenge");
    const slug = prob?.slug || "";
    const topic = prob?.topic || "Algorithms";
    const difficulty = prob?.difficulty || "easy";
    const isAC = sub.status === "accepted";
    const timeStr = formatRelativeTime(sub.created_at);

    // Clean, consistent git-style short hash
    const commitHash =
      String(sub.id).replace(/[^a-zA-Z0-9]/g, "").slice(-7).toLowerCase() || "0000000";

    const msg = isAC ? `Solved '${title}'` : `Attempted '${title}'`;

    let desc = "";
    if (isAC) {
      desc = `Passed all test cases in ${sub.runtime_ms != null ? `${sub.runtime_ms}ms` : "<1ms"} • ${sub.language || "code"}`;
    } else if (sub.status === "wrong_answer") {
      const passed = sub.passed_count ?? 0;
      const total = sub.total_count ?? 0;
      desc = `Wrong Answer (${passed}/${total} test cases passed) • ${sub.language || "code"}`;
    } else if (sub.status === "time_limit_exceeded") {
      desc = `Time Limit Exceeded • ${sub.language || "code"}`;
    } else if (sub.status === "compilation_error") {
      desc = `Compilation Error • ${sub.language || "code"}`;
    } else if (sub.status === "runtime_error") {
      desc = `Runtime Error • ${sub.language || "code"}`;
    } else {
      desc = `Encountered verdict: ${sub.status ? sub.status.replace(/_/g, " ") : "attempt"} • ${sub.language || "code"}`;
    }

    return {
      id: sub.id,
      title,
      slug,
      topic,
      difficulty,
      date: timeStr,
      msg,
      desc,
      isAC,
      commitHash,
    };
  });

  if (submissions.length === 0) {
    return (
      <div className="git-card p-6 animate-slide-up select-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            <span>Solve Timeline</span>
          </h3>
          <span className="text-[10px] font-mono font-bold text-muted-foreground bg-secondary-background border-2 border-black px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#000]">
            0 Commits
          </span>
        </div>
        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-main border-2 border-black mx-auto flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <GitCommit className="w-6 h-6 text-main-foreground" />
          </div>
          <div>
            <h4 className="text-sm font-black text-foreground">No solve commits yet</h4>
            <p className="text-xs text-muted-foreground font-medium mt-1 max-w-sm mx-auto">
              Pick a coding challenge in the problem arena and commit your first solution!
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/problems"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-main text-main-foreground font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              <span>Explore Challenges</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="git-card p-5 animate-slide-up select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b-2 border-black/10 pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-main" />
          <h3 className="text-sm font-black text-foreground">Solve Timeline</h3>
          <span className="text-[9px] font-mono font-bold bg-main text-main-foreground px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0px_#000]">
            {totalAcceptedCount} Solved / {sortedSubmissions.length} Total
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-background border-2 border-black p-0.5 rounded-lg shadow-[1px_1px_0px_#000]">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-black transition-all cursor-pointer ${
              filterMode === "all"
                ? "bg-main text-main-foreground border border-black shadow-[1px_1px_0px_#000]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilterMode("solves")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-black transition-all cursor-pointer ${
              filterMode === "solves"
                ? "bg-[#8bd600] text-black border border-black shadow-[1px_1px_0px_#000]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Solves Only
          </button>
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center space-y-2 my-2">
          <p className="text-xs font-black text-foreground">No accepted solves recorded yet</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            Switch back to &ldquo;All Activity&rdquo; to review your attempts or solve a challenge.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-4 border-black ml-3.5 space-y-5">
          {recentCommits.map((c) => (
            <div key={c.id} className="relative group animate-fade">
              {/* Timeline commit icon */}
              <span
                className={`absolute -left-[32px] top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black shadow-[1px_1px_0px_0px_#000] transition-all group-hover:scale-110 ${
                  c.isAC ? "bg-[#8bd600]" : "bg-[#f85149]"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-black" />
              </span>

              <div className="bg-secondary-background border-2 border-black rounded-xl p-3.5 shadow-[2px_2px_0px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all relative">
                <div className="flex items-center justify-between gap-4">
                  <Link
                    href={c.slug ? `/problems/${c.slug}` : "/problems"}
                    className="font-mono text-[10px] font-black text-main hover:underline flex items-center gap-1.5"
                    title="Open challenge in arena"
                  >
                    <GitCommit className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span>commit #{c.commitHash}</span>
                  </Link>
                  <span className="text-[9px] font-mono font-bold text-muted-foreground">{c.date}</span>
                </div>

                <h4 className="text-xs font-black text-foreground mt-1.5 flex items-center gap-1.5">
                  {c.isAC ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8bd600] flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-[#f85149] flex-shrink-0" />
                  )}
                  <span className="truncate">{c.msg}</span>
                </h4>

                <p className="text-[11px] text-muted-foreground font-mono mt-1 leading-relaxed">{c.desc}</p>

                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-[9px] font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-black">
                    {c.topic}
                  </span>
                  <span
                    className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-black ${
                      c.difficulty === "easy"
                        ? "bg-[#8bd600] text-black"
                        : c.difficulty === "medium"
                        ? "bg-[#ffbf00] text-black"
                        : "bg-[#f85149] text-white"
                    }`}
                  >
                    {c.difficulty}
                  </span>
                  <span
                    className={`text-[8px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black ${
                      c.isAC ? "bg-[#8bd600]/20 text-[#8bd600]" : "bg-[#f85149]/20 text-[#f85149]"
                    }`}
                  >
                    {c.isAC ? "Accepted" : "Attempt"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sortedSubmissions.length > 5 && (
        <div className="mt-5 pt-3 border-t-2 border-black/10 text-center">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-main hover:underline"
          >
            <span>View all {sortedSubmissions.length} commits in profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Topic Mastery Languages Bar Component ──────────────────── */

function TopicLanguagesBar({
  submissions,
  problems,
}: {
  submissions: SubmissionResponse[];
  problems: ProblemSummary[];
}) {
  const solvedByTopic: Record<string, number> = {};
  const acceptedSubs = submissions.filter(s => s.status === "accepted");
  
  // Calculate unique problems solved per topic
  const uniqueSolved = new Set<string>();
  acceptedSubs.forEach(s => uniqueSolved.add(String(s.problem_id)));
  
  uniqueSolved.forEach(pid => {
    const prob = problems.find(p => String(p.id) === String(pid));
    if (prob) {
      solvedByTopic[prob.topic] = (solvedByTopic[prob.topic] || 0) + 1;
    }
  });

  const totalSolved = uniqueSolved.size;

  const topicsList = Object.entries(solvedByTopic).map(([name, count]) => {
    const pct = totalSolved > 0 ? Math.round((count / totalSolved) * 100) : 0;
    return { name, count, pct };
  }).sort((a, b) => b.count - a.count);

  const fallbackTopics = [
    { name: "Arrays", pct: 40, color: "#7a83ff", count: 0 },
    { name: "Strings", pct: 25, color: "#d67aff", count: 0 },
    { name: "Logic", pct: 20, color: "#8bd600", count: 0 },
    { name: "Stacks", pct: 15, color: "#ffbf00", count: 0 }
  ];

  const colors = ["#7a83ff", "#d67aff", "#8bd600", "#ffbf00", "#f85149"];
  const displayTopics = topicsList.length > 0
    ? topicsList.slice(0, 4).map((t, idx) => ({ ...t, color: colors[idx % colors.length] }))
    : fallbackTopics;

  // Re-normalize percentages for display bar if total > 0
  const barSum = displayTopics.reduce((acc, t) => acc + t.pct, 0);

  return (
    <div className="git-card p-5 animate-slide-up select-none">
      <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
        <Code className="w-4 h-4 text-muted-foreground" />
        <span>Topic Mastery</span>
      </h3>

      <div className="flex h-4 w-full overflow-hidden border-2 border-black rounded-xl bg-background mb-5 shadow-[1px_1px_0px_0px_#000]">
        {displayTopics.map((t, idx) => {
          const widthPct = barSum > 0 ? (t.pct / barSum) * 100 : 25;
          return (
            <div
              key={t.name}
              className="h-full border-r-2 last:border-r-0 border-black transition-all duration-700 animate-line-fill"
              style={{
                width: `${widthPct}%`,
                backgroundColor: t.color,
              }}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {displayTopics.map((t) => (
          <div key={t.name} className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: t.color }} />
              <span className="text-xs font-bold text-foreground truncate max-w-[100px]">{t.name}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground pl-4.5">
              {topicsList.length > 0 ? `${t.count} solved` : `${t.pct}% solved`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Dashboard Page ────────────────────────────────────── */

export default function HomePage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [streak, setStreak] = useState<UserStreakResponse | null>(null);
  const [problemMap, setProblemMap] = useState<Record<string, ProblemSummary>>({});
  const [dailyChallenge, setDailyChallenge] = useState<GlobalDailyChallengeResponse | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const email = user?.primaryEmailAddress?.emailAddress || user?.email || "";
  const ghAccount = user?.externalAccounts?.find(
    (acc: any) => acc.provider === "github" || acc.provider === "oauth_github"
  );
  const ghUsername = (ghAccount as any)?.username;
  const username = user?.username || ghUsername || (email ? email.split("@")[0] : null);
  const displayName = user?.fullName || user?.firstName || ghUsername || username || "Coder";

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [problemsData, submissionsData, streakData, dailyData] = await Promise.all([
          listProblems().catch(() => []),
          listMySubmissions().catch(() => []),
          getMyStreak().catch(() => null),
          getGlobalDailyChallenge().catch(() => null),
        ]);
        
        setProblems(problemsData);
        setSubmissions(submissionsData);
        setStreak(streakData);
        setDailyChallenge(dailyData);

        const pMap: Record<string, ProblemSummary> = {};
        problemsData.forEach((p) => {
          if (p.id != null) pMap[String(p.id)] = p;
          if ((p as any)._id != null) pMap[String((p as any)._id)] = p;
          if (p.slug) pMap[String(p.slug)] = p;
          if ((p as any).titleSlug) pMap[String((p as any).titleSlug)] = p;
        });
        setProblemMap(pMap);
      } catch (err) {
        console.error("Dashboard loading error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboard();
  }, [user]);

  // Live countdown timer to 12:00 AM UTC reset
  useEffect(() => {
    if (!dailyChallenge || dailyChallenge.seconds_until_reset == null) return;
    let secondsLeft = dailyChallenge.seconds_until_reset;

    const updateTimer = () => {
      if (secondsLeft <= 0) {
        setTimeLeftStr("Resetting...");
        return;
      }
      const h = Math.floor(secondsLeft / 3600);
      const m = Math.floor((secondsLeft % 3600) / 60);
      const s = secondsLeft % 60;
      setTimeLeftStr(`${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
      secondsLeft -= 1;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dailyChallenge]);

  const totalSolved = new Set(
    submissions.filter(s => s.status === "accepted").map(s => s.problem_id)
  ).size;

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
          <span className="text-xs font-mono font-bold text-muted-foreground">Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
      {/* Header section */}
      <div className="bg-secondary-background border-b-4 border-black py-5 sm:py-7 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono font-bold">
              <User className="w-4 h-4 text-black dark:text-white" />
              <Link href={user ? "/profile" : "/auth"} className="hover:underline cursor-pointer">
                {displayName}
              </Link>
              <span>/</span>
              <span className="text-foreground font-black hover:underline cursor-pointer">dashboard</span>
              <span className="text-[9px] px-2 py-0.5 rounded-xl border-2 border-black bg-main text-main-foreground font-black uppercase tracking-wider">
                {user ? "Online" : "Guest"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Don't just code → <span className="text-main">Get optimized</span>
            </h1>
            <p className="text-xs text-muted-foreground max-w-lg font-medium">
              Prove how well you code, not just how much. AI-native competitive coding arena with instant execution feedback.
            </p>
          </div>

          {/* Action Counters */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap select-none">
            <div className="flex items-center rounded-xl border-2 border-black bg-secondary-background overflow-hidden shadow-[2.5px_2.5px_0px_0px_#000]">
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs bg-main text-main-foreground font-black border-r-2 border-black">
                <Flame className="w-3.5 h-3.5" />
                <span>STREAK</span>
              </div>
              <span className="px-3 py-1 text-xs font-black text-foreground bg-secondary-background">
                {streak?.current_streak || 0}d
              </span>
            </div>

            <div className="flex items-center rounded-xl border-2 border-black bg-secondary-background overflow-hidden shadow-[2.5px_2.5px_0px_0px_#000]">
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#ffbf00] text-black font-black border-r-2 border-black">
                <Trophy className="w-3.5 h-3.5" />
                <span>SOLVED</span>
              </div>
              <span className="px-3 py-1 text-xs font-black text-foreground bg-secondary-background">
                {problems.length ? `${totalSolved}/${problems.length}` : "0"}
              </span>
            </div>

            <div className="flex items-center rounded-xl border-2 border-black bg-secondary-background overflow-hidden shadow-[2.5px_2.5px_0px_0px_#000]">
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#7a83ff] text-white font-black border-r-2 border-black">
                <Award className="w-3.5 h-3.5" />
                <span>SOLVES</span>
              </div>
              <span className="px-3 py-1 text-xs font-black text-foreground bg-secondary-background">
                {streak?.total_solves || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-[1200px] mx-auto mt-4 sm:mt-6 flex gap-2.5 overflow-x-auto px-4 sm:px-0">
          <button className="flex items-center gap-2 px-4 py-2 text-xs font-black bg-main text-main-foreground border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000]">
            <BookOpen className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <Link
            href="/problems"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-secondary-background text-foreground border-2 border-transparent hover:border-black rounded-xl transition-all hover:shadow-[2px_2px_0px_0px_#000]"
          >
            <GitPullRequest className="w-4 h-4 text-muted-foreground" />
            <span>Problems</span>
          </Link>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Columns (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="git-card p-5 animate-slide-up select-none">
            <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-main" />
              <span>Actions Workspace</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <Link
                href={
                  dailyChallenge?.problem_slug
                    ? `/problems/${dailyChallenge.problem_slug}`
                    : problems[0]
                    ? `/problems/${problems[0].slug}`
                    : "/problems"
                }
                className="bg-secondary-background border-2 border-black text-foreground p-3 sm:p-4 flex flex-col justify-between items-start gap-2.5 h-[120px] sm:h-[130px] rounded-xl shadow-[3px_3px_0px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <Play className="w-4 h-4 text-[#8bd600] group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="text-[9px] uppercase font-mono font-black px-1.5 py-0.5 rounded border border-black bg-main text-main-foreground shadow-[1px_1px_0px_0px_#000]">
                      {dailyChallenge?.generated_by_ai ? "AI Daily" : "Daily Challenge"}
                    </span>
                  </div>
                  {dailyChallenge?.is_solved ? (
                    <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded border border-black bg-[#8bd600] text-black">
                      ✓ SOLVED
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono font-bold text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span>{timeLeftStr || "12am UTC"}</span>
                    </span>
                  )}
                </div>
                <div className="w-full">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-black text-foreground truncate">
                      {dailyChallenge?.problem_title || problems[0]?.title || "Daily Challenge"}
                    </h4>
                    {dailyChallenge?.difficulty && (
                      <span
                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-black flex-shrink-0 ${
                          dailyChallenge.difficulty === "easy"
                            ? "bg-[#8bd600] text-black"
                            : dailyChallenge.difficulty === "medium"
                            ? "bg-[#ffbf00] text-black"
                            : "bg-[#f85149] text-white"
                        }`}
                      >
                        {dailyChallenge.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate font-mono font-bold mt-0.5">
                    {dailyChallenge?.topic ? `${dailyChallenge.topic.toUpperCase()} • Resets 12am UTC` : "Practice DSA Problems"}
                  </p>
                </div>
              </Link>

              <Link
                href="/problems"
                className="bg-secondary-background border-2 border-black text-foreground p-3 sm:p-4 flex flex-col justify-between items-start gap-3 h-[110px] sm:h-[124px] rounded-xl shadow-[3px_3px_0px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <Code className="w-5 h-5 text-[#7a83ff] group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded border-2 border-black bg-[#ffbf00] text-black shadow-[1px_1px_0px_0px_#000]">
                    Core
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-foreground">Browse Problems</h4>
                  <p className="text-[11px] text-muted-foreground font-bold">Arrays, strings, graphs and dp</p>
                </div>
              </Link>

              <Link
                href="/arena"
                className="bg-secondary-background border-2 border-black text-foreground p-3 sm:p-4 flex flex-col justify-between items-start gap-3 h-[110px] sm:h-[124px] rounded-xl shadow-[3px_3px_0px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <Swords className="w-5 h-5 text-[#f85149] group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded border-2 border-black bg-[#f85149] text-white shadow-[1px_1px_0px_0px_#000] animate-pulse">
                    Live
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-foreground">The Arena</h4>
                  <p className="text-[11px] text-muted-foreground font-bold">1v1 Real-time Coding Battles</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Contribution Calendar */}
          <ContributionCalendar submissions={submissions} />

          {/* Activity / Git timeline */}
          <GitTimeline submissions={submissions} problemMap={problemMap} />
        </div>

        {/* Right Columns (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Topic Mastery progress */}
          <TopicLanguagesBar submissions={submissions} problems={problems} />

          {/* Division info */}
          <div className="git-card p-5 animate-slide-up select-none">
            <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#ffbf00]" />
              <span>Division Info</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-2 border-2 border-black rounded-xl bg-background shadow-[1.5px_1.5px_0px_0px_#000]">
                <div className="w-9 h-9 rounded-xl bg-main border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-main-foreground animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-foreground">Bronze League</h4>
                  <p className="text-[10px] text-muted-foreground font-bold">Top 20% advance weekly</p>
                </div>
              </div>

              <div className="border-t-2 border-black pt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold">League Solves</span>
                  <span className="font-mono text-foreground font-black">{totalSolved}</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-2.5">
                  <span className="text-muted-foreground font-bold">Current Rank</span>
                  <span className="font-mono text-foreground font-black">
                    {totalSolved > 0 ? "#1" : "#—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Platforms Diagnostics */}
          <div className="git-card p-5 animate-slide-up select-none">
            <h3 className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#8bd600]" />
              <span>Actions Diagnostics</span>
            </h3>
            <div className="bg-black border-2 border-black rounded-xl p-3.5 font-mono text-[10px] text-[#8bd600] space-y-1 select-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-muted-foreground font-bold">$ curl -s http://localhost:8000/health</div>
              <div>{"{"}</div>
              <div className="pl-4">"status": "healthy",</div>
              <div className="pl-4">"code_runner": "local-subprocess",</div>
              <div className="pl-4">"ai_reasoning": "active",</div>
              <div className="pl-4">"version": "2.0.0-mvp"</div>
              <div>{"}"}</div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
