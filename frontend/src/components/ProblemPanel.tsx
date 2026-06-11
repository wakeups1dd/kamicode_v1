"use client";

import type { ProblemDetail } from "@/lib/types";

interface ProblemPanelProps {
  problem: ProblemDetail;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colorMap: Record<string, string> = {
    easy: "text-[var(--kami-green)] bg-[var(--kami-green)]/10 border-[var(--kami-green)]/30",
    medium: "text-[var(--kami-amber)] bg-[var(--kami-amber)]/10 border-[var(--kami-amber)]/30",
    hard: "text-[var(--kami-error)] bg-[var(--kami-error)]/10 border-[var(--kami-error)]/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider ${colorMap[difficulty] || colorMap.easy}`}
    >
      {difficulty}
    </span>
  );
}

function TopicBadge({ topic }: { topic: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-[var(--kami-cyan)]/20 text-[var(--kami-cyan)] bg-[var(--kami-cyan)]/5">
      {topic}
    </span>
  );
}

export default function ProblemPanel({ problem }: ProblemPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 scrollbar-thin">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <DifficultyBadge difficulty={problem.difficulty} />
          <TopicBadge topic={problem.topic} />
          <span className="text-xs text-[var(--kami-cyan)]/50 ml-auto font-mono">
            ⏱ {problem.time_limit_ms}ms · 💾 {Math.round(problem.memory_limit_kb / 1024)}MB
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {problem.title}
        </h1>
      </div>

      {/* Description */}
      <div className="prose prose-invert prose-sm max-w-none">
        <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
          {problem.description}
        </div>
      </div>

      {/* Constraints */}
      {problem.constraints && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--kami-cyan)] uppercase tracking-wider">
            Constraints
          </h3>
          <div className="bg-[var(--kami-panel-alt)]/50 rounded-lg p-4 font-mono text-xs text-gray-400 whitespace-pre-wrap border border-[var(--kami-panel-alt)]">
            {problem.constraints}
          </div>
        </div>
      )}

      {/* Examples */}
      {problem.examples && problem.examples.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--kami-cyan)] uppercase tracking-wider">
            Examples
          </h3>
          {problem.examples.map((ex, idx) => (
            <div
              key={idx}
              className="bg-[var(--kami-panel-alt)]/30 rounded-lg border border-[var(--kami-panel-alt)] overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div className="flex gap-6">
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                      Input
                    </span>
                    <pre className="text-sm text-[var(--kami-green)] font-mono bg-[var(--kami-bg)]/50 p-2.5 rounded">
                      {ex.input}
                    </pre>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                      Output
                    </span>
                    <pre className="text-sm text-[var(--kami-cyan)] font-mono bg-[var(--kami-bg)]/50 p-2.5 rounded">
                      {ex.output}
                    </pre>
                  </div>
                </div>
                {ex.explanation && (
                  <p className="text-xs text-gray-400 pt-2 border-t border-[var(--kami-panel-alt)]">
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
