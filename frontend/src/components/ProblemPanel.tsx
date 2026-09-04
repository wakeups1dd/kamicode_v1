"use client";

import { useState } from "react";
import type { ProblemDetail } from "@/lib/types";
import { BookOpen, HelpCircle, Lightbulb, Sparkles, CheckCircle } from "lucide-react";

interface ProblemPanelProps {
  problem: ProblemDetail;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colorMap: Record<string, string> = {
    easy: "bg-[#8bd600] text-black border-black",
    medium: "bg-[#ffbf00] text-black border-black",
    hard: "bg-[#f85149] text-white border-black",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border-2 shadow-[1.5px_1.5px_0px_0px_#000] uppercase tracking-wider ${colorMap[difficulty] || colorMap.easy}`}
    >
      {difficulty}
    </span>
  );
}

function TopicBadge({ topic }: { topic: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-black border-2 border-black text-foreground bg-[#7a83ff] shadow-[1.5px_1.5px_0px_0px_#000]">
      {topic}
    </span>
  );
}

export default function ProblemPanel({ problem }: ProblemPanelProps) {
  const [tab, setTab] = useState<"description" | "editorial">("description");
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Tab Switcher */}
      <div className="flex items-center gap-2 px-6 pt-4 pb-2 border-b-2 border-black bg-secondary-background flex-shrink-0">
        <button
          onClick={() => setTab("description")}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-black text-xs uppercase border-2 border-black rounded-xl transition-all ${
            tab === "description"
              ? "bg-main text-main-foreground shadow-[2px_2px_0px_0px_#000]"
              : "bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Description
        </button>
        <button
          onClick={() => setTab("editorial")}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-black text-xs uppercase border-2 border-black rounded-xl transition-all ${
            tab === "editorial"
              ? "bg-[#d67aff] text-black shadow-[2px_2px_0px_0px_#000]"
              : "bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 text-black" /> Editorial & Hints
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {tab === "description" ? (
          <>
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <DifficultyBadge difficulty={problem.difficulty} />
                <TopicBadge topic={problem.topic} />
                <span className="text-xs text-muted-foreground ml-auto font-mono font-bold">
                  ⏱ {problem.time_limit_ms || 2000}ms · 💾 {Math.round((problem.memory_limit_kb || 256000) / 1024)}MB
                </span>
              </div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {problem.title}
              </h1>
            </div>

            {/* Description */}
            <div className="prose prose-sm max-w-none">
              <div className="text-foreground/90 font-medium leading-relaxed whitespace-pre-wrap">
                {problem.description}
              </div>
            </div>

            {/* Constraints */}
            {problem.constraints && (
              <div className="space-y-2">
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Constraints
                </h3>
                <div className="bg-secondary-background rounded-xl p-4 font-mono text-xs text-foreground whitespace-pre-wrap border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  {Array.isArray(problem.constraints) ? problem.constraints.join("\n") : problem.constraints}
                </div>
              </div>
            )}

            {/* Examples */}
            {problem.examples && problem.examples.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Examples
                </h3>
                {problem.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="bg-secondary-background rounded-xl border-2 border-black overflow-hidden shadow-[3px_3px_0px_0px_#000]"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex gap-6">
                        <div className="flex-1 space-y-1.5">
                          <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                            Input
                          </span>
                          <pre className="text-sm text-foreground font-mono bg-background p-2.5 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                            {ex.input}
                          </pre>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                            Output
                          </span>
                          <pre className="text-sm text-main font-mono bg-background p-2.5 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                            {ex.output}
                          </pre>
                        </div>
                      </div>
                      {ex.explanation && (
                        <p className="text-xs text-muted-foreground pt-2.5 border-t-2 border-black font-bold">
                          💡 {ex.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Editorial & Hints Tab */
          <div className="space-y-6">
            <div className="bg-secondary-background border-2 border-black p-5 rounded-2xl shadow-[4px_4px_0px_0px_#000] space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-main" />
                <h2 className="font-black text-base uppercase tracking-tight">Optimal Strategy & Big-O</h2>
              </div>
              <p className="text-xs font-medium text-foreground/90 leading-relaxed">
                To solve <strong>{problem.title}</strong> optimally for topic <strong>{problem.topic}</strong>, analyze input boundaries before implementing.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-background border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_#000]">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Target Time Complexity</span>
                  <p className="font-mono font-black text-sm text-[#8bd600]">
                    {problem.difficulty === "easy" ? "O(N) or O(log N)" : problem.difficulty === "medium" ? "O(N log N) or O(N)" : "O(N) optimal"}
                  </p>
                </div>
                <div className="bg-background border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_#000]">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Target Space Complexity</span>
                  <p className="font-mono font-black text-sm text-[#7a83ff]">
                    {problem.topic === "two-pointers" || problem.topic === "binary-search" ? "O(1) in-place" : "O(N) auxiliary"}
                  </p>
                </div>
              </div>
            </div>

            {/* Intuition Card */}
            <div className="bg-background border-2 border-black p-5 rounded-2xl shadow-[4px_4px_0px_0px_#000] space-y-3">
              <h3 className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#8bd600]" /> Core Intuition
              </h3>
              <ul className="text-xs font-medium space-y-2 list-disc list-inside text-foreground/90">
                <li>Identify edge cases first (empty inputs, single elements, negative coordinates).</li>
                <li>Leverage {problem.topic.replace('-', ' ')} invariants to eliminate brute-force search paths.</li>
                <li>Maintain clean standard I/O consumption matching test case structures.</li>
              </ul>
            </div>

            {/* Interactive Solution Hint */}
            <div className="bg-secondary-background border-2 border-black p-5 rounded-2xl shadow-[4px_4px_0px_0px_#000] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-main" /> Solution Hint
                </h3>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="px-3 py-1 bg-main text-main-foreground font-black text-xs uppercase border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  {showHint ? "Hide Hint" : "Reveal Hint"}
                </button>
              </div>

              {showHint ? (
                <div className="p-3 bg-background border-2 border-black rounded-xl text-xs font-mono text-foreground animate-fade">
                  Consider using standard iterative approaches or two-pointer passes to avoid nested looping. Pay close attention to index bounds and data types.
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-bold">
                  Click reveal if you are stuck. Solution hints provide algorithmic guidance without spoiling the code.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
