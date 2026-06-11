"use client";

import type { SubmissionResponse, TestResultItem } from "@/lib/types";

interface TerminalConsoleProps {
  submission: SubmissionResponse | null;
  isLoading: boolean;
}

function StatusIndicator({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: "Queued", color: "text-gray-400", icon: "⏳" },
    running: { label: "Executing", color: "text-[var(--kami-amber)]", icon: "⚡" },
    accepted: { label: "Accepted", color: "text-[var(--kami-green)]", icon: "✓" },
    wrong_answer: { label: "Wrong Answer", color: "text-[var(--kami-error)]", icon: "✗" },
    time_limit_exceeded: { label: "Time Limit Exceeded", color: "text-[var(--kami-amber)]", icon: "⏱" },
    runtime_error: { label: "Runtime Error", color: "text-[var(--kami-error)]", icon: "💥" },
    compilation_error: { label: "Compilation Error", color: "text-[var(--kami-error)]", icon: "🔧" },
  };

  const config = statusConfig[status] || { label: status, color: "text-gray-400", icon: "?" };

  return (
    <span className={`flex items-center gap-2 font-semibold text-sm ${config.color}`}>
      <span className="text-base">{config.icon}</span>
      {config.label}
    </span>
  );
}

function TestCaseRow({ result, index }: { result: TestResultItem; index: number }) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        result.passed
          ? "bg-[var(--kami-green)]/5 border-[var(--kami-green)]/20"
          : "bg-[var(--kami-error)]/5 border-[var(--kami-error)]/20"
      }`}
    >
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          result.passed
            ? "bg-[var(--kami-green)]/20 text-[var(--kami-green)]"
            : "bg-[var(--kami-error)]/20 text-[var(--kami-error)]"
        }`}
      >
        {result.passed ? "✓" : "✗"}
      </span>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="text-xs font-semibold text-gray-400">Test Case {index + 1}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Expected</span>
            <pre className="text-xs font-mono text-[var(--kami-cyan)] bg-[var(--kami-bg)]/50 p-1.5 rounded truncate">
              {result.expected}
            </pre>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Actual</span>
            <pre
              className={`text-xs font-mono p-1.5 rounded truncate ${
                result.passed ? "text-[var(--kami-green)]" : "text-[var(--kami-error)]"
              } bg-[var(--kami-bg)]/50`}
            >
              {result.actual || "(empty)"}
            </pre>
          </div>
        </div>
        {result.error && (
          <pre className="text-xs font-mono text-[var(--kami-error)]/80 bg-[var(--kami-error)]/5 p-2 rounded mt-1 whitespace-pre-wrap">
            {result.error}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function TerminalConsole({ submission, isLoading }: TerminalConsoleProps) {
  return (
    <div className="h-full flex flex-col bg-[var(--kami-bg)] rounded-lg border border-[var(--kami-panel-alt)] overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--kami-panel)] border-b border-[var(--kami-panel-alt)]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--kami-error)]/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--kami-amber)]/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--kami-green)]/60" />
          </div>
          <span className="text-xs font-mono text-gray-500 ml-2">output</span>
        </div>
        {submission && <StatusIndicator status={submission.status} />}
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {/* Empty state */}
        {!submission && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
            <span className="text-3xl">⌨</span>
            <span className="text-sm font-mono">Submit your code to see results</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-[var(--kami-cyan)]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--kami-cyan)] animate-spin" />
            </div>
            <span className="text-sm font-mono text-[var(--kami-cyan)]/70 animate-pulse">
              Executing on Judge0...
            </span>
          </div>
        )}

        {/* Results */}
        {submission && !isLoading && (
          <>
            {/* Stats bar */}
            {submission.status !== "pending" && submission.status !== "running" && (
              <div className="flex items-center gap-4 text-xs font-mono text-gray-400 pb-2 border-b border-[var(--kami-panel-alt)]">
                <span>
                  Tests:{" "}
                  <span className="text-[var(--kami-green)]">{submission.passed_count}</span>
                  <span className="text-gray-600">/{submission.total_count}</span>
                </span>
                {submission.runtime_ms != null && (
                  <span>
                    Runtime:{" "}
                    <span className="text-[var(--kami-cyan)]">{submission.runtime_ms}ms</span>
                  </span>
                )}
                {submission.memory_kb != null && (
                  <span>
                    Memory:{" "}
                    <span className="text-[var(--kami-violet)]">
                      {(submission.memory_kb / 1024).toFixed(1)}MB
                    </span>
                  </span>
                )}
              </div>
            )}

            {/* Stderr */}
            {submission.stderr && (
              <pre className="text-xs font-mono text-[var(--kami-error)] bg-[var(--kami-error)]/5 p-3 rounded-lg border border-[var(--kami-error)]/20 whitespace-pre-wrap">
                {submission.stderr}
              </pre>
            )}

            {/* Test cases */}
            {submission.test_results && submission.test_results.length > 0 && (
              <div className="space-y-2">
                {submission.test_results.map((result, idx) => (
                  <TestCaseRow key={idx} result={result} index={idx} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
