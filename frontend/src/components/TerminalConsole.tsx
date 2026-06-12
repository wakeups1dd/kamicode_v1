"use client";

import type { SubmissionResponse, TestResultItem } from "@/lib/types";

interface TerminalConsoleProps {
  submission: SubmissionResponse | null;
  isLoading: boolean;
}

function StatusIndicator({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    pending: { label: "Queued", bg: "bg-muted", text: "text-foreground", icon: "⏳" },
    running: { label: "Executing", bg: "bg-[#ffbf00]", text: "text-black", icon: "⚡" },
    accepted: { label: "Accepted", bg: "bg-[#8bd600]", text: "text-black", icon: "✓" },
    wrong_answer: { label: "Wrong Answer", bg: "bg-[#f85149]", text: "text-white", icon: "✗" },
    time_limit_exceeded: { label: "Time Limit Exceeded", bg: "bg-[#ffbf00]", text: "text-black", icon: "⏱" },
    runtime_error: { label: "Runtime Error", bg: "bg-[#f85149]", text: "text-white", icon: "💥" },
    compilation_error: { label: "Compilation Error", bg: "bg-[#f85149]", text: "text-white", icon: "🔧" },
  };

  const config = statusConfig[status] || { label: status, bg: "bg-muted", text: "text-foreground", icon: "?" };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] border-2 border-black font-black text-[10px] uppercase shadow-[1.5px_1.5px_0px_0px_#000] ${config.bg} ${config.text}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function TestCaseRow({ result, index }: { result: TestResultItem; index: number }) {
  return (
    <div
      className={`flex items-start gap-3.5 p-4 rounded-[6px] border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] transition-colors ${
        result.passed
          ? "bg-[#8bd600]/10"
          : "bg-[#f85149]/10"
      }`}
    >
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-[4px] border-2 border-black flex items-center justify-center text-xs font-black shadow-[1.5px_1.5px_0px_0px_#000] ${
          result.passed
            ? "bg-[#8bd600] text-black"
            : "bg-[#f85149] text-white"
        }`}
      >
        {result.passed ? "✓" : "✗"}
      </span>
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="text-xs font-black text-foreground uppercase tracking-wider">Test Case {index + 1}</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Expected</span>
            <pre className="text-xs font-mono text-foreground bg-background p-2 rounded-[4px] border border-black truncate font-bold">
              {result.expected}
            </pre>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Actual</span>
            <pre
              className={`text-xs font-mono p-2 rounded-[4px] border border-black truncate font-bold ${
                result.passed ? "text-[#8bd600] bg-background" : "text-[#f85149] bg-background"
              }`}
            >
              {result.actual || "(empty)"}
            </pre>
          </div>
        </div>
        {result.error && (
          <pre className="text-xs font-mono text-[#f85149] bg-black p-2.5 rounded-[4px] border border-black mt-2 whitespace-pre-wrap font-bold">
            {result.error}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function TerminalConsole({ submission, isLoading }: TerminalConsoleProps) {
  return (
    <div className="h-full flex flex-col bg-background rounded-[6px] border-2 border-black overflow-hidden shadow-[3px_3px_0px_0px_#000]">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4.5 py-3 bg-secondary-background border-b-2 border-black flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#f85149] border border-black" />
            <div className="w-3 h-3 rounded-full bg-[#ffbf00] border border-black" />
            <div className="w-3 h-3 rounded-full bg-[#8bd600] border border-black" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-foreground ml-2">output</span>
        </div>
        {submission && <StatusIndicator status={submission.status} />}
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Empty state */}
        {!submission && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
            <span className="text-4xl">⌨</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Submit your code to see results</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-main animate-spin" />
            </div>
            <span className="text-xs font-mono text-main font-bold animate-pulse uppercase tracking-wider">
              Executing test cases...
            </span>
          </div>
        )}

        {/* Results */}
        {submission && !isLoading && (
          <>
            {/* Stats bar */}
            {submission.status !== "pending" && submission.status !== "running" && (
              <div className="flex items-center gap-4 text-xs font-mono text-foreground font-bold pb-3 border-b-2 border-black">
                <span>
                  Tests:{" "}
                  <span className="text-[#8bd600] font-black">{submission.passed_count}</span>
                  <span className="text-muted-foreground">/{submission.total_count}</span>
                </span>
                {submission.runtime_ms != null && (
                  <span>
                    Runtime:{" "}
                    <span className="text-[#7a83ff] font-black">{submission.runtime_ms}ms</span>
                  </span>
                )}
                {submission.memory_kb != null && (
                  <span>
                    Memory:{" "}
                    <span className="text-[#d67aff] font-black">
                      {(submission.memory_kb / 1024).toFixed(1)}MB
                    </span>
                  </span>
                )}
              </div>
            )}

            {/* Stderr */}
            {submission.stderr && (
              <pre className="text-xs font-mono text-[#f85149] bg-black p-3.5 rounded-[6px] border-2 border-black whitespace-pre-wrap font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {submission.stderr}
              </pre>
            )}

            {/* Test cases */}
            {submission.test_results && submission.test_results.length > 0 && (
              <div className="space-y-3.5">
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
