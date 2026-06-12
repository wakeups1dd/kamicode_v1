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
  BookOpen,
  Sparkles,
  Terminal,
  Plus
} from "lucide-react";

/* ── Contribution Calendar Component ────────────────────────── */

function ContributionCalendar({ solvedCount }: { solvedCount: number }) {
  // Generate 53 weeks * 7 days = 371 grid tiles
  const [tiles, setTiles] = useState<{ id: number; level: number }[]>([]);

  useEffect(() => {
    // Create deterministic green/orange levels to simulate solve history
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

  // Purple theme levels
  const levelColors = [
    "bg-background border border-black/10 dark:border-black/30", // Level 0
    "bg-[#ebd5ff] border border-black/20", // Level 1: Light Purple
    "bg-[#d8b4fe] border border-black/40", // Level 2: Medium Purple
    "bg-[#a855f7] border border-black/60", // Level 3: Main Purple
    "bg-[#6b21a8] border border-black",    // Level 4: Dark Purple
  ];

  return (
    <div className="git-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>Contributions & Solves</span>
        </h3>
        <span className="text-xs text-muted-foreground font-mono font-bold">
          {solvedCount} solved in the past year
        </span>
      </div>

      <div className="flex gap-2 items-start justify-center overflow-x-auto py-1 select-none">
        {/* Day-of-week indicators */}
        <div className="grid grid-rows-7 gap-[3px] text-[9px] text-muted-foreground pt-5 pr-1 font-mono font-bold">
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
              className={`w-[10px] h-[10px] rounded-[2px] transition-all hover:scale-125 hover:ring-2 hover:ring-black cursor-pointer opacity-0 ${levelColors[tile.level]} animate-grid-box`}
              style={{
                animationDelay: `${Math.floor(i / 7) * 8}ms`,
              }}
              title={`Day ${i + 1}: Level ${tile.level} Activity`}
            />
          ))}
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground mt-3 pr-2 font-mono font-bold">
        <span>Less</span>
        <span className="w-2.5 h-2.5 rounded-[1px] bg-background border border-black/20" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#ffd2ad] border border-black/20" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#ffaa5e] border border-black/40" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#ff7a05] border border-black/60" />
        <span className="w-2.5 h-2.5 rounded-[1px] bg-[#b85300] border border-black" />
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
      <div className="git-card p-5 animate-slide-up text-center py-12 text-muted-foreground text-sm font-bold">
        No recent activity. Start solving problems!
      </div>
    );
  }

  return (
    <div className="git-card p-5 animate-slide-up">
      <h3 className="text-sm font-black text-foreground mb-5 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-muted-foreground" />
        <span>Solve Timeline</span>
      </h3>

      <div className="relative pl-6 border-l-4 border-black ml-3.5 space-y-6">
        {/* Animating line overlay */}
        <div className="absolute left-[-4px] top-0 bottom-0 w-[4px] bg-main origin-top animate-timeline" />

        {recentCommits.map((c) => (
          <div key={c.id} className="relative group animate-fade">
            {/* Timeline commit icon */}
            <span className="absolute -left-[32px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-main border-2 border-black shadow-[1px_1px_0px_0px_#000] transition-all group-hover:scale-110">
              <span className="h-2 w-2 rounded-full bg-black" />
            </span>

            <div className="bg-secondary-background border-2 border-black rounded-[6px] p-4 shadow-[2px_2px_0px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all relative">
              <div className="flex items-center justify-between gap-4">
                <Link
                  href={`/problems/${c.slug}`}
                  className="font-mono text-xs font-black text-main hover:underline flex items-center gap-1.5"
                >
                  <GitCommit className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>commit #{String(c.id).padStart(7, "0")}</span>
                </Link>
                <span className="text-[10px] font-mono font-bold text-muted-foreground">{c.date}</span>
              </div>
              <h4 className="text-sm font-black text-foreground mt-2">{c.msg}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
              <div className="flex items-center gap-2 mt-3.5">
                <span className="text-[10px] font-mono font-bold text-foreground bg-background px-2.5 py-0.5 rounded border-2 border-black">
                  {c.topic}
                </span>
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border-2 border-black ${
                    c.difficulty === "easy"
                      ? "bg-[#8bd600] text-black"
                      : c.difficulty === "medium"
                      ? "bg-[#ffbf00] text-black"
                      : "bg-[#f85149] text-white"
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
    { name: "Arrays", pct: 40, color: "#7a83ff" },
    { name: "Strings", pct: 25, color: "#d67aff" },
    { name: "Dynamic Programming", pct: 15, color: "#8bd600" },
    { name: "Trees & Graphs", pct: 12, color: "#ffbf00" },
    { name: "Math", pct: 8, color: "#f85149" },
  ];

  return (
    <div className="git-card p-5 animate-slide-up">
      <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
        <Code className="w-4 h-4 text-muted-foreground" />
        <span>Topic Mastery</span>
      </h3>

      {/* Neobrutalist Progress Bar */}
      <div className="flex h-4 w-full overflow-hidden border-2 border-black rounded-[6px] bg-background mb-5 shadow-[1px_1px_0px_0px_#000]">
        {topics.map((t, idx) => (
          <div
            key={t.name}
            className="h-full border-r-2 last:border-r-0 border-black transition-all duration-700 animate-line-fill"
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
              <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: t.color }} />
              <span className="text-xs font-bold text-foreground">{t.name}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground pl-4.5">{t.pct}% solved</span>
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
    <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
      {/* ── Nick Launches Styled Repository-Style Header ── */}
      <div className="bg-secondary-background border-b-4 border-black py-7 px-6 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono font-bold">
              <User className="w-4 h-4 text-black dark:text-white" />
              <span className="hover:underline cursor-pointer">Coder</span>
              <span>/</span>
              <span className="text-foreground font-black hover:underline cursor-pointer">dashboard</span>
              <span className="text-[9px] px-2 py-0.5 rounded-[4px] border-2 border-black bg-main text-main-foreground font-black uppercase tracking-wider">
                Public
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Don't just code → <span className="text-main">Get optimized</span>
            </h1>
            <p className="text-xs text-muted-foreground max-w-lg font-medium">
              Prove how well you code, not just how much. AI-native competitive coding arena with instant execution feedback.
            </p>
          </div>

          {/* Action Counters (Neobrutalist Box Counters) */}
          <div className="flex items-center gap-3 flex-wrap select-none">
            <div className="flex items-center rounded-[6px] border-2 border-black bg-secondary-background overflow-hidden shadow-[2.5px_2.5px_0px_0px_#000]">
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs bg-main text-main-foreground font-black border-r-2 border-black">
                <Flame className="w-3.5 h-3.5" />
                <span>STREAK</span>
              </div>
              <span className="px-3 py-1 text-xs font-black text-foreground bg-secondary-background">0</span>
            </div>

            <div className="flex items-center rounded-[6px] border-2 border-black bg-secondary-background overflow-hidden shadow-[2.5px_2.5px_0px_0px_#000]">
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#ffbf00] text-black font-black border-r-2 border-black">
                <Trophy className="w-3.5 h-3.5" />
                <span>SOLVED</span>
              </div>
              <span className="px-3 py-1 text-xs font-black text-foreground bg-secondary-background">
                {problems.length ? `0/${problems.length}` : "0"}
              </span>
            </div>

            <div className="flex items-center rounded-[6px] border-2 border-black bg-secondary-background overflow-hidden shadow-[2.5px_2.5px_0px_0px_#000]">
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#7a83ff] text-white font-black border-r-2 border-black">
                <Award className="w-3.5 h-3.5" />
                <span>RATING</span>
              </div>
              <span className="px-3 py-1 text-xs font-black text-foreground bg-secondary-background">Unrated</span>
            </div>
          </div>
        </div>

        {/* Repository Tab Sub-Nav */}
        <div className="max-w-[1200px] mx-auto mt-6 flex gap-2.5">
          <button className="flex items-center gap-2 px-4 py-2 text-xs font-black bg-main text-main-foreground border-2 border-black rounded-[6px] shadow-[2px_2px_0px_0px_#000]">
            <BookOpen className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <Link
            href="/problems"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-secondary-background text-foreground border-2 border-transparent hover:border-black rounded-[6px] transition-all hover:shadow-[2px_2px_0px_0px_#000]"
          >
            <GitPullRequest className="w-4 h-4 text-muted-foreground" />
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
            <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-main" />
              <span>Actions Workspace</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href={problems[0] ? `/problems/${problems[0].slug}` : "/problems"}
                className="bg-secondary-background border-2 border-black text-foreground p-4 flex flex-col justify-between items-start gap-3 h-[124px] rounded-[6px] shadow-[3px_3px_0px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all group relative overflow-hidden"
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
                    {problems[0]?.title || "Loading daily challenge..."}
                  </p>
                </div>
              </Link>

              <Link
                href="/problems"
                className="bg-secondary-background border-2 border-black text-foreground p-4 flex flex-col justify-between items-start gap-3 h-[124px] rounded-[6px] shadow-[3px_3px_0px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all group relative overflow-hidden"
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
                href={
                  problems.length > 0
                    ? `/problems/${problems[Math.floor(Math.random() * problems.length)].slug}`
                    : "/problems"
                }
                className="bg-secondary-background border-2 border-black text-foreground p-4 flex flex-col justify-between items-start gap-3 h-[124px] rounded-[6px] shadow-[3px_3px_0px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <Plus className="w-5 h-5 text-[#d67aff] group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded border-2 border-black bg-[#7a83ff] text-white shadow-[1px_1px_0px_0px_#000]">
                    Random
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-foreground">Shuffle Coding</h4>
                  <p className="text-[11px] text-muted-foreground font-bold">Choose a random puzzle to solve</p>
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
            <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#ffbf00]" />
              <span>Division Info</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-2 border-2 border-black rounded-[6px] bg-background shadow-[1.5px_1.5px_0px_0px_#000]">
                <div className="w-9 h-9 rounded-[4px] bg-main border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-main-foreground" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-foreground">Bronze League</h4>
                  <p className="text-[10px] text-muted-foreground font-bold">Top 20% advance weekly</p>
                </div>
              </div>

              <div className="border-t-2 border-black pt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold">League Solves</span>
                  <span className="font-mono text-foreground font-black">0</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-2.5">
                  <span className="text-muted-foreground font-bold">League Rank</span>
                  <span className="font-mono text-foreground font-black">#—</span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Info Panel */}
          <div className="git-card p-5 animate-slide-up">
            <h3 className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#8bd600]" />
              <span>Actions Output</span>
            </h3>
            <div className="bg-black border-2 border-black rounded-[6px] p-3.5 font-mono text-[10px] text-[#8bd600] space-y-1 select-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-muted-foreground font-bold">$ curl -s https://kamicode.com/api/status</div>
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
