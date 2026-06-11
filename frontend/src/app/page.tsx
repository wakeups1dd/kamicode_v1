"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listProblems } from "@/lib/api";
import type { ProblemSummary } from "@/lib/types";
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
  ChevronRight,
  BookOpen,
  Sparkles,
  CheckCircle2,
  GitMerge,
  Terminal,
  Plus
} from "lucide-react";

/* ── Contribution Calendar Component ────────────────────────── */

function ContributionCalendar({ solvedCount }: { solvedCount: number }) {
  // Generate 53 weeks * 7 days = 371 grid tiles
  const [tiles, setTiles] = useState<{ id: number; level: number }[]>([]);

  useEffect(() => {
    // Create deterministic green levels to simulate solve history
    const baseSeed = [0, 0, 1, 0, 0, 2, 0, 1, 3, 0, 0, 0, 2, 4, 1, 0, 0, 0, 2, 0, 0, 1, 0, 3, 0, 2, 0, 0, 1, 0, 2, 4, 0, 0, 1, 0, 0, 0];
    const generated = Array.from({ length: 371 }, (_, idx) => {
      let level = 0;
      if (idx > 320) {
        // High density of activity in recent weeks
        level = baseSeed[idx % baseSeed.length];
      } else if (idx > 150 && idx < 200) {
        // A mid-year burst of coding activity
        level = (idx % 3 === 0) ? Math.floor(Math.random() * 3) + 1 : 0;
      } else {
        // Sparsely distributed activity
        level = (idx % 11 === 0) ? 1 : (idx % 17 === 0) ? 2 : 0;
      }
      return { id: idx, level };
    });

    // Seed current day solves if solvedCount > 0
    if (solvedCount > 0 && generated.length > 0) {
      generated[generated.length - 1].level = 4;
      generated[generated.length - 2].level = 3;
      generated[generated.length - 4].level = 2;
    }
    setTiles(generated);
  }, [solvedCount]);

  const levelColors = [
    "bg-[#161b22]", // Level 0: None
    "bg-[#0e4429]", // Level 1: Low
    "bg-[#006d32]", // Level 2: Mid-Low
    "bg-[#26a641]", // Level 3: Mid-High
    "bg-[#39d353]", // Level 4: High
  ];

  return (
    <div className="git-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#f0f6fc] flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#8b949e]" />
          <span>Contributions & Solves</span>
        </h3>
        <span className="text-xs text-[#8b949e] font-mono">
          {solvedCount} solved in the past year
        </span>
      </div>

      <div className="flex gap-2 items-start justify-center overflow-x-auto py-1 select-none">
        {/* Day-of-week indicators */}
        <div className="grid grid-rows-7 gap-[3px] text-[9px] text-[#8b949e] pt-5 pr-1 font-mono">
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
          {tiles.map((tile, i) => (
            <div
              key={tile.id}
              className={`w-[10px] h-[10px] rounded-[2px] transition-all hover:scale-125 hover:ring-1 hover:ring-[#8b949e] cursor-pointer opacity-0 ${levelColors[tile.level]} animate-grid-box`}
              style={{
                animationDelay: `${Math.floor(i / 7) * 8}ms`,
              }}
              title={`Day ${i + 1}: Level ${tile.level} Activity`}
            />
          ))}
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-[#8b949e] mt-3 pr-2 font-mono">
        <span>Less</span>
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#161b22]" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#0e4429]" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#006d32]" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#26a641]" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#39d353]" />
        <span>More</span>
      </div>
    </div>
  );
}

/* ── Git Timeline Component ────────────────────────────────── */

function GitTimeline({ problems }: { problems: ProblemSummary[] }) {
  // Take first 3 problems to simulate recent commits
  const recentCommits = problems.slice(0, 3).map((p, idx) => {
    const dates = ["2 hours ago", "Yesterday", "3 days ago"];
    const efficiency = ["98.2% runtime efficiency", "85.7% memory saving", "optimal time complexity"];
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      topic: p.topic,
      difficulty: p.difficulty,
      date: dates[idx] || "Recently",
      msg: `Optimize & solve '${p.title}'`,
      desc: `Successfully passed all test cases with ${efficiency[idx] || "optimal complexity"}.`,
    };
  });

  if (recentCommits.length === 0) {
    return (
      <div className="git-card p-5 animate-slide-up text-center py-12 text-[#8b949e] text-sm">
        No recent activity. Start solving problems!
      </div>
    );
  }

  return (
    <div className="git-card p-5 animate-slide-up">
      <h3 className="text-sm font-semibold text-[#f0f6fc] mb-5 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-[#8b949e]" />
        <span>Solve Timeline</span>
      </h3>

      <div className="relative pl-6 border-l border-[#30363d] ml-3.5 space-y-6">
        {/* Animating line overlay */}
        <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-[#2ea44f] origin-top animate-timeline" />

        {recentCommits.map((c) => (
          <div key={c.id} className="relative group animate-fade">
            {/* Timeline commit icon */}
            <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#161b22] ring-4 ring-[#0d1117] transition-all group-hover:scale-125">
              <span className="h-2.5 w-2.5 rounded-full bg-[#39d353] group-hover:bg-[#58a6ff] transition-colors" />
            </span>

            <div className="bg-[#161b22]/50 border border-[#30363d] rounded-md p-3.5 hover:border-[#8b949e] transition-colors relative">
              <div className="flex items-center justify-between gap-4">
                <Link
                  href={`/problems/${c.slug}`}
                  className="font-mono text-xs font-semibold text-[#58a6ff] hover:underline flex items-center gap-1.5"
                >
                  <GitCommit className="w-3.5 h-3.5 text-[#8b949e]" />
                  <span>commit #{String(c.id).padStart(7, "0")}</span>
                </Link>
                <span className="text-[10px] font-mono text-[#8b949e]">{c.date}</span>
              </div>
              <h4 className="text-sm font-semibold text-[#f0f6fc] mt-1.5">{c.msg}</h4>
              <p className="text-xs text-[#8b949e] mt-1 leading-relaxed">{c.desc}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-mono text-[#8b949e] bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                  {c.topic}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    c.difficulty === "easy"
                      ? "text-[#39d353] border-[#39d353]/30 bg-[#39d353]/8"
                      : c.difficulty === "medium"
                      ? "text-[#d29922] border-[#d29922]/30 bg-[#d29922]/8"
                      : "text-[#f85149] border-[#f85149]/30 bg-[#f85149]/8"
                  }`}
                >
                  {c.difficulty}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Topic Mastery Languages Bar Component ──────────────────── */

function TopicLanguagesBar() {
  const topics = [
    { name: "Arrays", pct: 40, color: "#58a6ff" },
    { name: "Strings", pct: 25, color: "#8957e5" },
    { name: "Dynamic Programming", pct: 15, color: "#39d353" },
    { name: "Trees & Graphs", pct: 12, color: "#d29922" },
    { name: "Math", pct: 8, color: "#f85149" },
  ];

  return (
    <div className="git-card p-5 animate-slide-up">
      <h3 className="text-sm font-semibold text-[#f0f6fc] mb-4 flex items-center gap-2">
        <Code className="w-4 h-4 text-[#8b949e]" />
        <span>Topic Mastery</span>
      </h3>

      {/* GitHub Repo Style Multi-Color Bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#21262d] mb-5">
        {topics.map((t, idx) => (
          <div
            key={t.name}
            className="h-full transition-all duration-700 animate-line-fill"
            style={{
              width: `${t.pct}%`,
              backgroundColor: t.color,
              animationDelay: `${idx * 150}ms`,
            }}
          />
        ))}
      </div>

      {/* Topic Legend */}
      <div className="grid grid-cols-2 gap-4">
        {topics.map((t) => (
          <div key={t.name} className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-xs font-medium text-[#c9d1d9]">{t.name}</span>
            </div>
            <span className="text-[10px] font-mono text-[#8b949e] pl-4">{t.pct}% solved</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Dashboard Page ────────────────────────────────────── */

export default function HomePage() {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProblems()
      .then(setProblems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-[#0D1117] text-[#c9d1d9] font-sans pb-12 animate-fade">
      {/* ── Repository-Style Header ── */}
      <div className="bg-[#161B22] border-b border-[#30363D] py-6 px-6 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 text-[#8b949e] text-sm font-mono">
              <User className="w-4 h-4" />
              <span className="hover:underline cursor-pointer">Coder</span>
              <span>/</span>
              <span className="text-[#f0f6fc] font-semibold hover:underline cursor-pointer">dashboard</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#30363d] bg-[#0d1117] font-sans font-medium">
                Public
              </span>
            </div>
            <p className="text-xs text-[#8b949e]">
              Prove how well you code, not just how much. AI-native competitive coding arena.
            </p>
          </div>

          {/* Action Counters (GitHub Star/Fork mock styling) */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono select-none">
            <div className="flex items-center rounded-md border border-[#30363D] bg-[#21262D] overflow-hidden">
              <button className="flex items-center gap-1.5 px-3 py-1 text-[#c9d1d9] hover:bg-[#30363D] transition-colors border-r border-[#30363D]">
                <Flame className="w-3.5 h-3.5 text-[#d29922]" />
                <span>Streak</span>
              </button>
              <span className="px-2.5 py-1 text-[#f0f6fc] bg-[#161B22] font-semibold">0</span>
            </div>

            <div className="flex items-center rounded-md border border-[#30363D] bg-[#21262D] overflow-hidden">
              <button className="flex items-center gap-1.5 px-3 py-1 text-[#c9d1d9] hover:bg-[#30363D] transition-colors border-r border-[#30363D]">
                <Trophy className="w-3.5 h-3.5 text-[#58a6ff]" />
                <span>Solved</span>
              </button>
              <span className="px-2.5 py-1 text-[#f0f6fc] bg-[#161B22] font-semibold">
                {problems.length ? `0/${problems.length}` : "0"}
              </span>
            </div>

            <div className="flex items-center rounded-md border border-[#30363D] bg-[#21262D] overflow-hidden">
              <button className="flex items-center gap-1.5 px-3 py-1 text-[#c9d1d9] hover:bg-[#30363D] transition-colors border-r border-[#30363D]">
                <Award className="w-3.5 h-3.5 text-[#39d353]" />
                <span>Rating</span>
              </button>
              <span className="px-2.5 py-1 text-[#f0f6fc] bg-[#161B22] font-semibold">Unrated</span>
            </div>
          </div>
        </div>

        {/* Repository Tab Sub-Nav */}
        <div className="max-w-[1200px] mx-auto mt-6 flex gap-1 border-b border-transparent">
          <button className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#f0f6fc] border-b-2 border-[#f78166] transition-colors">
            <BookOpen className="w-4 h-4 text-[#8b949e]" />
            <span>Overview</span>
          </button>
          <Link
            href="/problems"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#8b949e] hover:text-[#f0f6fc] border-b-2 border-transparent hover:border-[#30363d] transition-colors"
          >
            <GitPullRequest className="w-4 h-4 text-[#8b949e]" />
            <span>Problems</span>
          </Link>
        </div>
      </div>

      {/* ── Main Grid Layout ── */}
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Columns (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Workflow Actions */}
          <div className="git-card p-5 animate-slide-up">
            <h3 className="text-sm font-semibold text-[#f0f6fc] mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#d29922]" />
              <span>Actions Workspace</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link
                href={problems[0] ? `/problems/${problems[0].slug}` : "/problems"}
                className="action-btn-git p-4 flex flex-col justify-between items-start gap-3 h-[120px] group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <Play className="w-5 h-5 text-[#39d353] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-[#30363d] text-[#8b949e]">
                    Daily Run
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#f0f6fc]">Daily Challenge</h4>
                  <p className="text-[11px] text-[#8b949e] truncate max-w-full">
                    {problems[0]?.title || "Loading daily challenge..."}
                  </p>
                </div>
              </Link>

              <Link
                href="/problems"
                className="action-btn-git p-4 flex flex-col justify-between items-start gap-3 h-[120px] group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <Code className="w-5 h-5 text-[#58a6ff] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-[#30363d] text-[#8b949e]">
                    Core
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#f0f6fc]">Browse Problems</h4>
                  <p className="text-[11px] text-[#8b949e]">Solve arrays, strings, dynamic programing</p>
                </div>
              </Link>

              <Link
                href={
                  problems.length > 0
                    ? `/problems/${problems[Math.floor(Math.random() * problems.length)].slug}`
                    : "/problems"
                }
                className="action-btn-git p-4 flex flex-col justify-between items-start gap-3 h-[120px] group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <Plus className="w-5 h-5 text-[#8957e5] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-[#30363d] text-[#8b949e]">
                    Random
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#f0f6fc]">Shuffle Coding</h4>
                  <p className="text-[11px] text-[#8b949e]">Choose a random puzzle to solve</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Contribution Grid */}
          <ContributionCalendar solvedCount={0} />

          {/* Activity / Git timeline */}
          <GitTimeline problems={problems} />
        </div>

        {/* Right Columns (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Topic Languages statistics */}
          <TopicLanguagesBar />

          {/* Top Solver repository stats */}
          <div className="git-card p-5 animate-slide-up">
            <h3 className="text-sm font-semibold text-[#f0f6fc] mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#d29922]" />
              <span>Division Info</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#21262d] border border-[#30363d] flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#8b949e]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#f0f6fc]">Bronze League</h4>
                  <p className="text-[10px] text-[#8b949e]">Top 20% advance weekly</p>
                </div>
              </div>

              <div className="border-t border-[#21262d] pt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8b949e]">League Solves</span>
                  <span className="font-mono text-[#f0f6fc]">0</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-2">
                  <span className="text-[#8b949e]">League Rank</span>
                  <span className="font-mono text-[#f0f6fc]">#—</span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Info Panel */}
          <div className="git-card p-5 animate-slide-up">
            <h3 className="text-sm font-semibold text-[#f0f6fc] mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#39d353]" />
              <span>Actions Output</span>
            </h3>
            <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-3 font-mono text-[10px] text-[#39d353] space-y-1 select-all">
              <div className="text-[#8b949e]">$ curl -s https://kamicode.com/api/status</div>
              <div>{"{"}</div>
              <div className="pl-4">"status": "online",</div>
              <div className="pl-4">"compiler_node": "judge0-sandbox",</div>
              <div className="pl-4">"ai_reasoning": "enabled",</div>
              <div className="pl-4">"version": "1.0.0-beta"</div>
              <div>{"}"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
