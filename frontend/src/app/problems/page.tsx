"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listProblems } from "@/lib/api";
import type { ProblemSummary } from "@/lib/types";
import {
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  Tag,
  ArrowUpDown,
  GitPullRequest,
  HelpCircle
} from "lucide-react";

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "solved" | "unsolved">("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");

  useEffect(() => {
    listProblems()
      .then(setProblems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Filter computation
  const filtered = problems.filter((p) => {
    // Search query filter
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.topic.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Difficulty filter
    if (difficultyFilter !== "all" && p.difficulty !== difficultyFilter) {
      return false;
    }
    // Topic filter
    if (topicFilter !== "all" && p.topic.toLowerCase() !== topicFilter.toLowerCase()) {
      return false;
    }
    // Status filter (currently all problems are unsolved in DB since backend is not finished, but we mock/support it)
    if (statusFilter === "solved") {
      return false; // mock unsolved
    }
    return true;
  });

  // Unique topics list
  const allTopics = Array.from(new Set(problems.map((p) => p.topic)));

  // Count items
  const countEasy = problems.filter((p) => p.difficulty === "easy").length;
  const countMedium = problems.filter((p) => p.difficulty === "medium").length;
  const countHard = problems.filter((p) => p.difficulty === "hard").length;

  return (
    <div className="min-h-full bg-[#0D1117] text-[#c9d1d9] font-sans pb-12 animate-fade">
      {/* Breadcrumbs header */}
      <div className="bg-[#161B22] border-b border-[#30363D] py-6 px-6 sm:px-8">
        <div className="max-w-[1100px] mx-auto space-y-1.5">
          <div className="flex items-center gap-2 text-[#8b949e] text-sm font-mono">
            <span className="hover:underline cursor-pointer">Coder</span>
            <span>/</span>
            <span className="text-[#f0f6fc] font-semibold hover:underline cursor-pointer">problems</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#30363d] bg-[#0d1117] font-sans font-medium">
              main
            </span>
          </div>
          <p className="text-xs text-[#8b949e]">
            Browse and solve competitive coding challenges. Run test suites and get instant AI complexity evaluations.
          </p>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-6">
        {/* GitHub Issues style Filters Section */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main GitHub Search Query Input */}
          <div className="flex-1 flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 focus-within:border-[#58a6ff] focus-within:ring-1 focus-within:ring-[#58a6ff] transition-all">
            <span className="text-xs font-mono text-[#8b949e] pr-1 border-r border-[#30363d] select-none">
              is:problem
            </span>
            <Search className="w-4 h-4 text-[#8b949e] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search problems or labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-[#f0f6fc] placeholder-[#484f58] outline-none flex-1"
            />
          </div>

          {/* Quick Dropdown Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Difficulty dropdown */}
            <div className="relative group">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as any)}
                className="appearance-none bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-[#f0f6fc] rounded-md pl-3 pr-8 py-1.5 text-xs font-semibold cursor-pointer outline-none transition-colors"
              >
                <option value="all">Difficulty: All</option>
                <option value="easy">Easy ({countEasy})</option>
                <option value="medium">Medium ({countMedium})</option>
                <option value="hard">Hard ({countHard})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8b949e] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Topic label dropdown */}
            <div className="relative group">
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="appearance-none bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-[#f0f6fc] rounded-md pl-3 pr-8 py-1.5 text-xs font-semibold cursor-pointer outline-none transition-colors"
              >
                <option value="all">Label: All Topics</option>
                {allTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    Label: {topic}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8b949e] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Problems Main Box - styled like GitHub Issue List */}
        <div className="git-card overflow-hidden animate-slide-up">
          {/* Header of the Issue box */}
          <div className="bg-[#161B22] border-b border-[#30363D] px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            {/* Status tabs */}
            <div className="flex items-center gap-4 text-xs font-medium select-none">
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex items-center gap-1.5 ${
                  statusFilter === "all" ? "text-[#f0f6fc] font-semibold" : "text-[#8b949e] hover:text-[#f0f6fc]"
                }`}
              >
                <AlertCircle className="w-4 h-4 text-[#8b949e]" />
                <span>{problems.length} Problems</span>
              </button>

              <button
                onClick={() => setStatusFilter("solved")}
                className={`flex items-center gap-1.5 ${
                  statusFilter === "solved" ? "text-[#f0f6fc] font-semibold" : "text-[#8b949e] hover:text-[#f0f6fc]"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#8b949e]" />
                <span>0 Solved</span>
              </button>
            </div>

            {/* Muted helpful label */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-[#8b949e]">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Labels represent DSA topics</span>
              </span>
              <span className="flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Default sorting</span>
              </span>
            </div>
          </div>

          {/* List items */}
          {loading && (
            <div className="flex justify-center py-20 bg-[#161B22]/10">
              <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#58a6ff] animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-6 bg-[#f85149]/10 border-b border-[#30363d] text-[#f85149] text-sm">
              Failed to fetch repository problems: {error}
            </div>
          )}

          {!loading && !error && (
            <div className="divide-y divide-[#30363D]">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#8b949e] gap-3">
                  <HelpCircle className="w-10 h-10 text-[#484f58]" />
                  <span className="text-sm">No problems matching search parameters.</span>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDifficultyFilter("all");
                      setTopicFilter("all");
                      setStatusFilter("all");
                    }}
                    className="text-xs text-[#58a6ff] hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                filtered.map((p, idx) => (
                  <div
                    key={p.id}
                    className="problem-row p-4 flex items-start gap-3 hover:bg-[#161b22]/40 transition-colors animate-fade"
                  >
                    {/* Status Circle Check */}
                    <span className="mt-0.5 flex-shrink-0">
                      {/* Solved is false for all since db seed isn't compiled yet */}
                      <AlertCircle className="w-4 h-4 text-[#8b949e] mt-0.5" />
                    </span>

                    {/* Middle Column: Title & Subinfo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <Link
                          href={`/problems/${p.slug}`}
                          className="text-sm font-bold text-[#c9d1d9] hover:text-[#58a6ff] transition-colors hover:underline truncate"
                        >
                          {p.title}
                        </Link>

                        {/* Label Badge */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1f2937] text-[#9ca3af] border border-[#374151]">
                          {p.topic}
                        </span>
                      </div>

                      {/* Sub-text information */}
                      <div className="text-[11px] text-[#8b949e] mt-1.5 flex flex-wrap items-center gap-1.5 font-mono">
                        <span>#0{idx + 1}</span>
                        <span>·</span>
                        <span>opened by system</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <GitPullRequest className="w-3 h-3" />
                          <span>active workspace</span>
                        </span>
                      </div>
                    </div>

                    {/* Right Columns: Difficulty pill & Stats */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          p.difficulty === "easy"
                            ? "text-[#39d353] border-[#39d353]/30 bg-[#39d353]/8"
                            : p.difficulty === "medium"
                            ? "text-[#d29922] border-[#d29922]/30 bg-[#d29922]/8"
                            : "text-[#f85149] border-[#f85149]/30 bg-[#f85149]/8"
                        }`}
                      >
                        {p.difficulty}
                      </span>
                      <span className="hidden sm:inline font-mono text-xs text-[#484f58] w-12 text-right">
                        —
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
