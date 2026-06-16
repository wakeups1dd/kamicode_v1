"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { listProblems, listMySubmissions } from "@/lib/api";
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left appearance-none bg-secondary-background border-2 border-black text-foreground rounded-[6px] pl-3.5 pr-9 py-2 text-xs font-black outline-none shadow-[2.5px_2.5px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-none transition-all"
      >
        {labelPrefix}{selectedOption?.label}
        <ChevronDown className={`w-4 h-4 text-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      
      {isOpen && (
        <div className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-2 min-w-full whitespace-nowrap max-h-[50vh] overflow-y-auto bg-secondary-background/90 backdrop-blur-md border-2 border-black rounded-[6px] shadow-[4px_4px_0px_0px_#000] z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100`}>
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

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<number>>(new Set());
  const [attemptedProblemIds, setAttemptedProblemIds] = useState<Set<number>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "solved" | "unsolved">("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      listProblems(),
      listMySubmissions().catch(() => [])
    ])
      .then(([problemsData, submissionsData]) => {
        setProblems(problemsData);
        
        const solved = new Set<number>();
        const attempted = new Set<number>();
        
        submissionsData.forEach((sub) => {
          attempted.add(sub.problem_id);
          if (sub.status === "accepted") {
            solved.add(sub.problem_id);
          }
        });
        
        setSolvedProblemIds(solved);
        setAttemptedProblemIds(attempted);
      })
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
    // Status filter
    const isSolved = solvedProblemIds.has(p.id);
    if (statusFilter === "solved" && !isSolved) {
      return false;
    }
    if (statusFilter === "unsolved" && isSolved) {
      return false;
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
    <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
      {/* Breadcrumbs header */}
      <div className="bg-secondary-background border-b-4 border-black py-7 px-6 sm:px-8">
        <div className="max-w-[1100px] mx-auto space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono font-bold">
            <span className="hover:underline cursor-pointer">Coder</span>
            <span>/</span>
            <span className="text-foreground font-black hover:underline cursor-pointer">problems</span>
            <span className="text-[9px] px-2 py-0.5 rounded-[4px] border-2 border-black bg-main text-main-foreground font-black uppercase tracking-wider">
              main
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Explore <span className="text-main">Challenges</span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Browse and solve competitive coding challenges. Run test suites and get instant AI complexity evaluations.
          </p>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-6">
        {/* GitHub Issues style Filters Section */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Main Search Query Input */}
          <div className="flex-1 flex items-center gap-2 bg-secondary-background border-2 border-black rounded-[6px] px-3 py-2 shadow-[2.5px_2.5px_0px_0px_#000] focus-within:translate-x-[1px] focus-within:translate-y-[1px] focus-within:shadow-[1.5px_1.5px_0px_0px_#000] transition-all">
            <span className="text-xs font-mono font-black text-main pr-2 border-r-2 border-black select-none">
              is:problem
            </span>
            <Search className="w-4 h-4 text-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search problems or labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none flex-1 font-bold"
            />
          </div>

            {/* Quick Dropdown Selectors */}
            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Difficulty dropdown */}
              <CustomDropdown
                value={difficultyFilter}
                onChange={(val) => setDifficultyFilter(val as any)}
                labelPrefix="Difficulty: "
                options={[
                  { value: "all", label: "All" },
                  { value: "easy", label: `Easy (${countEasy})` },
                  { value: "medium", label: `Medium (${countMedium})` },
                  { value: "hard", label: `Hard (${countHard})` }
                ]}
              />

              {/* Topic label dropdown */}
              <CustomDropdown
                value={topicFilter}
                onChange={(val) => setTopicFilter(val)}
                labelPrefix="Topic: "
                align="right"
                options={[
                  { value: "all", label: "All" },
                  ...allTopics.map(topic => ({ value: topic, label: topic }))
                ]}
              />
            </div>
        </div>

        {/* Problems Main Box - styled like Neobrutalist Directory */}
        <div className="bg-secondary-background border-4 border-black rounded-[6px] shadow-[4px_4px_0px_0px_#000] overflow-hidden animate-slide-up">
          {/* Header of the directory box */}
          <div className="bg-main border-b-4 border-black px-4.5 py-3.5 flex flex-wrap items-center justify-between gap-4">
            {/* Status tabs */}
            <div className="flex items-center gap-3 text-xs font-bold select-none">
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border-2 border-black transition-all ${
                  statusFilter === "all" ? "bg-secondary-background text-foreground font-black shadow-[1.5px_1.5px_0px_0px_#000]" : "bg-transparent text-main-foreground hover:bg-white/20 font-black"
                }`}
              >
                <AlertCircle className="w-4 h-4 text-current" />
                <span>{problems.length} Problems</span>
              </button>

              <button
                onClick={() => setStatusFilter("solved")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border-2 border-black transition-all ${
                  statusFilter === "solved" ? "bg-secondary-background text-foreground font-black shadow-[1.5px_1.5px_0px_0px_#000]" : "bg-transparent text-main-foreground hover:bg-white/20 font-black"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-current" />
                <span>{solvedProblemIds.size} Solved</span>
              </button>
            </div>

            {/* Muted helpful label */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-main-foreground font-bold">
              <span className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                <span>DSA labels</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4" />
                <span>Default order</span>
              </span>
            </div>
          </div>

          {/* List items */}
          {loading && (
            <div className="flex justify-center py-20 bg-background/50">
              <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-6 bg-red-500/10 border-b-2 border-black text-red-500 text-sm font-bold">
              Failed to fetch repository problems: {error}
            </div>
          )}

          {!loading && !error && (
            <div className="divide-y-2 divide-black">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <HelpCircle className="w-10 h-10 text-muted-foreground/40" />
                  <span className="text-sm font-bold">No problems matching search parameters.</span>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDifficultyFilter("all");
                      setTopicFilter("all");
                      setStatusFilter("all");
                    }}
                    className="text-xs text-main hover:underline font-black"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                filtered.map((p, idx) => {
                  const isSolved = solvedProblemIds.has(p.id);
                  const isAttempted = attemptedProblemIds.has(p.id);
                  
                  return (
                    <div
                      key={p.id}
                      className="problem-row p-4.5 flex items-start gap-4 bg-secondary-background hover:bg-background/80 transition-colors animate-fade"
                    >
                      {/* Status Circle Check */}
                      <span className="mt-0.5 flex-shrink-0">
                        {isSolved ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-[#8bd600] mt-0.5" />
                        ) : isAttempted ? (
                          <AlertCircle className="w-4.5 h-4.5 text-[#ffbf00] mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4.5 h-4.5 text-muted-foreground mt-0.5" />
                        )}
                      </span>

                    {/* Middle Column: Title & Subinfo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                        <Link
                          href={`/problems/${p.slug}`}
                          className="text-sm font-black text-foreground hover:text-main transition-colors hover:underline truncate"
                        >
                          {p.title}
                        </Link>

                        {/* Label Badge */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-black bg-background text-foreground border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                          {p.topic}
                        </span>
                      </div>

                      {/* Sub-text information */}
                      <div className="text-[10px] text-muted-foreground mt-1.5 flex flex-wrap items-center gap-1.5 font-mono font-bold">
                        <span>#0{idx + 1}</span>
                        <span>·</span>
                        <span>opened by system</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-foreground">
                          <GitPullRequest className="w-3.5 h-3.5" />
                          <span>active workspace</span>
                        </span>
                      </div>
                    </div>

                    {/* Right Columns: Difficulty pill & Stats */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] ${
                          p.difficulty === "easy"
                            ? "bg-[#8bd600] text-black"
                            : p.difficulty === "medium"
                            ? "bg-[#ffbf00] text-black"
                            : "bg-[#f85149] text-white"
                        }`}
                      >
                        {p.difficulty}
                      </span>
                      <span className="hidden sm:inline font-mono font-bold text-xs text-muted-foreground w-12 text-right">
                        —
                      </span>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
