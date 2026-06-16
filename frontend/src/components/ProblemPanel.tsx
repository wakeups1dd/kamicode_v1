"use client";

import type { ProblemDetail } from "@/lib/types";

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
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 scrollbar-thin bg-background text-foreground">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <DifficultyBadge difficulty={problem.difficulty} />
          <TopicBadge topic={problem.topic} />
          <span className="text-xs text-muted-foreground ml-auto font-mono font-bold">
            ⏱ {problem.time_limit_ms}ms · 💾 {Math.round(problem.memory_limit_kb / 1024)}MB
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
            {problem.constraints}
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
    </div>
  );
}
