"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { listProblems, getMyStreak, listMySubmissions } from "@/lib/api";
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
  ArrowUpRight,
} from "lucide-react";

/* ── Helpers ────────────────────────────────────────────────── */

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

/* ── Contribution Calendar Component ────────────────────────── */

function ContributionCalendar({
  submissions,
  problemMap,
}: {
  submissions: SubmissionResponse[];
  problemMap: Record<string, ProblemSummary>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<"3m" | "6m" | "1y">("6m");
  const [tiles, setTiles] = useState<{
    id: number;
    level: number;
    dateStr: string;
    count: number;
    isFuture: boolean;
    isToday: boolean;
  }[]>([]);
  const [months, setMonths] = useState<{ label: string; colIndex: number }[]>([]);
  const [numCols, setNumCols] = useState(26);

  // Accepted submissions sorted newest first
  const acceptedSubs = [...submissions]
    .filter((s) => s.status === "accepted")
    .sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tB - tA;
    });

  const latestSolves = acceptedSubs.slice(0, 4);

  // Unique problems solved
  const totalSolvedUnique = new Set(
    acceptedSubs.map((s) => String(s.problem_id || (s as any).problemId || ""))
  ).size;

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon...
    const mondayOffset = (dayOfWeek + 6) % 7; // Mon = 0, ..., Sun = 6

    const weeks = range === "3m" ? 14 : range === "6m" ? 26 : 52;
    setNumCols(weeks);

    // Calculate start date: Monday of the earliest week in this range
    const startDate = new Date(today.getTime());
    startDate.setDate(today.getDate() - mondayOffset - (weeks - 1) * 7);
    startDate.setHours(0, 0, 0, 0);

    // Build a map of YYYY-MM-DD -> { count, accepted } from user submissions
    const activityMap: Record<string, { count: number; accepted: number }> = {};
    submissions.forEach((sub) => {
      if (!sub.created_at) return;
      const subDate = new Date(sub.created_at);
      const key = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, "0")}-${String(subDate.getDate()).padStart(2, "0")}`;
      if (!activityMap[key]) {
        activityMap[key] = { count: 0, accepted: 0 };
      }
      activityMap[key].count += 1;
      if (sub.status === "accepted") {
        activityMap[key].accepted += 1;
      }
    });

    const generatedTiles: {
      id: number;
      level: number;
      dateStr: string;
      count: number;
      isFuture: boolean;
      isToday: boolean;
    }[] = [];
    const monthLabels: { label: string; colIndex: number }[] = [];

    const totalDays = weeks * 7;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate.getTime());
      d.setDate(startDate.getDate() + i);

      const isToday = d.getTime() === today.getTime();
      const isFuture = d.getTime() > today.getTime();

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const activity = activityMap[key] || { count: 0, accepted: 0 };

      // Calculate level (0-4)
      let level = 0;
      if (!isFuture && activity.count > 0) {
        const score = activity.count + activity.accepted;
        if (score >= 5) level = 4;
        else if (score >= 3) level = 3;
        else if (score >= 2) level = 2;
        else level = 1;
      }

      const dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Track month labels: record on 1st of the month or 1st column
      const colIndex = Math.floor(i / 7);
      if (d.getDate() === 1 && !isFuture) {
        monthLabels.push({
          label: d.toLocaleDateString("en-US", { month: "short" }),
          colIndex,
        });
      }

      generatedTiles.push({
        id: i,
        level,
        dateStr,
        count: activity.count,
        isFuture,
        isToday,
      });
    }

    setTiles(generatedTiles);

    if (monthLabels.length === 0) {
      monthLabels.push({
        label: startDate.toLocaleDateString("en-US", { month: "short" }),
        colIndex: 0,
      });
    }

    // Filter month labels so they don't overlap (at least 3 columns apart)
    const filteredMonths = monthLabels.filter((m, i, arr) => {
      if (i === 0) return true;
      return m.colIndex - arr[i - 1].colIndex >= 3;
    });
    setMonths(filteredMonths);
  }, [submissions, range]);

  // Auto-scroll to the right so today & latest solves are instantly visible
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [range, tiles]);

  // Purple theme levels
  const levelColors = [
    "bg-background border border-black/10 dark:border-black/30", // Level 0
    "bg-[#ebd5ff] border border-black/20", // Level 1: Light Purple
    "bg-[#d8b4fe] border border-black/40", // Level 2: Medium Purple
    "bg-[#a855f7] border border-black/60", // Level 3: Main Purple
    "bg-[#6b21a8] border border-black",    // Level 4: Dark Purple
  ];

  return (
    <div className="git-card p-5 animate-slide-up select-none overflow-hidden">
      {/* Top Header: Title, Solved Count, and Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-main" />
          <h3 className="text-sm font-black text-foreground">Contributions &amp; Solves</h3>
          <span className="text-[10px] font-mono font-bold bg-main text-main-foreground px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0px_#000]">
            {totalSolvedUnique} Unique Solved
          </span>
        </div>

        {/* Range Selector: 3M, 6M, 1Y */}
        <div className="flex items-center gap-1 bg-background border-2 border-black p-0.5 rounded-lg shadow-[1px_1px_0px_#000] self-start sm:self-auto">
          {(
            [
              { id: "3m", label: "3 Months" },
              { id: "6m", label: "6 Months" },
              { id: "1y", label: "1 Year" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setRange(t.id)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black transition-all cursor-pointer ${
                range === t.id
                  ? "bg-main text-main-foreground border border-black shadow-[1px_1px_0px_#000]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={`View ${t.label}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Latest Solves Banner — Displays recent solves without any horizontal scrolling */}
      <div className="bg-secondary-background border-2 border-black rounded-xl p-3 mb-4 shadow-[2px_2px_0px_#000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-6 h-6 rounded-lg bg-[#8bd600] border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000]">
              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-xs font-black text-foreground">Latest Solves</span>
            <span className="text-[9px] font-mono font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-black">
              {acceptedSubs.length} Accepted
            </span>
          </div>

          {latestSolves.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              {latestSolves.map((sub) => {
                const prob =
                  problemMap[String(sub.problem_id)] ||
                  problemMap[String((sub as any).problemId)] ||
                  problemMap[String((sub as any).problem_slug)];

                const title =
                  prob?.title ||
                  (sub.problem_id ? `Problem #${String(sub.problem_id).slice(-6)}` : "Coding Challenge");
                const slug = prob?.slug || "";
                const timeAgo = formatRelativeTime(sub.created_at);
                const diff = prob?.difficulty || "easy";

                return (
                  <Link
                    key={sub.id}
                    href={slug ? `/problems/${slug}` : "/problems"}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background hover:bg-main hover:text-main-foreground border-2 border-black rounded-lg text-xs font-bold transition-all shadow-[1.5px_1.5px_0px_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] group"
                    title={`Solved ${timeAgo} • Click to open in arena`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        diff === "easy"
                          ? "bg-[#8bd600]"
                          : diff === "medium"
                          ? "bg-[#ffbf00]"
                          : "bg-[#f85149]"
                      }`}
                    />
                    <span className="truncate max-w-[130px] sm:max-w-[170px]">{title}</span>
                    <span className="text-[9px] font-mono text-muted-foreground group-hover:text-main-foreground/80">
                      {timeAgo}
                    </span>
                    <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
              <span>No accepted solves recorded yet.</span>
              <Link href="/problems" className="text-main font-bold hover:underline flex items-center gap-1">
                <span>Explore challenges</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Grid Section */}
      <div
        ref={scrollRef}
        className="flex flex-col overflow-x-auto py-1 scroll-smooth select-none"
      >
        {/* Month Labels aligned to grid columns */}
        <div
          className="grid gap-[2.5px] text-[10px] text-muted-foreground font-mono font-bold mb-1.5 h-4 w-max"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            marginLeft: "28px",
          }}
        >
          {months.map((m) => {
            const span = Math.min(3, numCols - m.colIndex);
            return (
              <span
                key={`${m.label}-${m.colIndex}`}
                className="truncate text-left pointer-events-none"
                style={{
                  gridColumnStart: m.colIndex + 1,
                  gridColumnEnd: `span ${span}`,
                }}
              >
                {m.label}
              </span>
            );
          })}
        </div>

        <div className="flex gap-2 items-start justify-start w-max">
          {/* Day-of-week indicators */}
          <div className="grid grid-rows-7 gap-[2.5px] text-[9px] text-muted-foreground font-mono font-bold pt-[1px] w-5 text-right select-none">
            <span className="h-2.5 sm:h-[11px] leading-none">Mon</span>
            <span className="invisible h-2.5 sm:h-[11px] leading-none">Tue</span>
            <span className="h-2.5 sm:h-[11px] leading-none">Wed</span>
            <span className="invisible h-2.5 sm:h-[11px] leading-none">Thu</span>
            <span className="h-2.5 sm:h-[11px] leading-none">Fri</span>
            <span className="invisible h-2.5 sm:h-[11px] leading-none">Sat</span>
            <span className="invisible h-2.5 sm:h-[11px] leading-none">Sun</span>
          </div>

          {/* Grid of Weeks (columns) x 7 Rows (days) */}
          <div className="grid grid-flow-col grid-rows-7 gap-[2.5px]">
            {tiles.map((tile) => {
              if (tile.isFuture) {
                return (
                  <div
                    key={tile.id}
                    className="w-2.5 h-2.5 sm:w-[11px] sm:h-[11px] rounded-[2px] opacity-0 pointer-events-none"
                  />
                );
              }

              return (
                <div
                  key={tile.id}
                  className={`w-2.5 h-2.5 sm:w-[11px] sm:h-[11px] rounded-[2px] transition-all hover:scale-150 hover:ring-2 hover:ring-black hover:z-10 cursor-pointer ${
                    tile.isToday ? "ring-2 ring-main ring-offset-1" : ""
                  } ${levelColors[tile.level]}`}
                  title={
                    tile.count > 0
                      ? `${tile.count} submission${tile.count > 1 ? "s" : ""} on ${tile.dateStr}${tile.isToday ? " (Today)" : ""}`
                      : `No activity on ${tile.dateStr}${tile.isToday ? " (Today)" : ""}`
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer / Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-2.5 border-t border-black/10 text-[10px] font-mono font-bold text-muted-foreground">
        <span>
          Showing {range === "3m" ? "past 3 months" : range === "6m" ? "past 6 months" : "full year"}
        </span>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-[1px] bg-background border border-black/20" />
          <span className="w-2.5 h-2.5 rounded-[1px] bg-[#ebd5ff] border border-black/20" />
          <span className="w-2.5 h-2.5 rounded-[1px] bg-[#d8b4fe] border border-black/40" />
          <span className="w-2.5 h-2.5 rounded-[1px] bg-[#a855f7] border border-black/60" />
          <span className="w-2.5 h-2.5 rounded-[1px] bg-[#6b21a8] border border-black" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
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
  
  uniqueSolved.forEach((pid) => {
    const prob = problems.find(
      (p) =>
        String(p.id) === String(pid) ||
        String((p as any)._id) === String(pid) ||
        String(p.slug) === String(pid)
    );
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
        const [problemsData, submissionsData, streakData] = await Promise.all([
          listProblems().catch(() => []),
          listMySubmissions().catch(() => []),
          getMyStreak().catch(() => null)
        ]);
        
        setProblems(problemsData);
        setSubmissions(submissionsData);
        setStreak(streakData);

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
                href={problems[0] ? `/problems/${problems[0].slug}` : "/problems"}
                className="bg-secondary-background border-2 border-black text-foreground p-3 sm:p-4 flex flex-col justify-between items-start gap-3 h-[110px] sm:h-[124px] rounded-xl shadow-[3px_3px_0px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <Play className="w-5 h-5 text-[#8bd600] group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded border-2 border-black bg-main text-main-foreground shadow-[1px_1px_0px_0px_#000]">
                    Daily Run
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-foreground">Daily Challenge</h4>
                  <p className="text-[11px] text-muted-foreground truncate max-w-full font-bold">
                    {problems[0]?.title || "Practice DSA Problems"}
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
          <ContributionCalendar submissions={submissions} problemMap={problemMap} />

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
