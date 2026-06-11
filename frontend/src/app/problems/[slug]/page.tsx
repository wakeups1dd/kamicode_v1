"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getProblem, submitCode, pollSubmission } from "@/lib/api";
import type { ProblemDetail, SubmissionResponse } from "@/lib/types";
import ProblemPanel from "@/components/ProblemPanel";
import TerminalConsole from "@/components/TerminalConsole";

// Dynamic import for Monaco to avoid SSR issues
const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[var(--kami-bg)] rounded-lg border border-[var(--kami-panel-alt)]">
      <div className="w-6 h-6 rounded-full border-2 border-transparent border-t-[var(--kami-cyan)] animate-spin" />
    </div>
  ),
});

export default function ProblemArenaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [code, setCode] = useState("");
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "results">("description");

  useEffect(() => {
    getProblem(slug)
      .then((p) => {
        setProblem(p);
        setCode(p.starter_code || "# Write your solution here\n");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async () => {
    if (!problem || isSubmitting) return;

    setIsSubmitting(true);
    setActiveTab("results");
    setSubmission(null);

    try {
      const sub = await submitCode({
        problem_id: problem.id,
        language: "python",
        source_code: code,
      });
      setSubmission(sub);

      // Poll for results
      const result = await pollSubmission(sub.id);
      setSubmission(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--kami-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-[var(--kami-cyan)] animate-spin" />
          <span className="text-xs text-gray-500 font-mono">Loading problem...</span>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--kami-bg)]">
        <div className="bg-[var(--kami-error)]/10 border border-[var(--kami-error)]/30 rounded-lg p-6 text-[var(--kami-error)] text-sm max-w-md text-center">
          {error || "Problem not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--kami-bg)] overflow-hidden">
      {/* ── Compact Top Bar ──────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#0D1117] border-b border-[var(--kami-panel-alt)]/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Back to problems */}
          <Link
            href="/problems"
            className="flex items-center gap-1.5 text-gray-500 hover:text-[var(--kami-cyan)] transition-colors text-xs font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Problems
          </Link>

          <div className="w-px h-4 bg-[var(--kami-panel-alt)]/60" />

          {/* Problem title */}
          <h2 className="text-sm font-semibold text-white truncate max-w-[300px]">
            {problem.title}
          </h2>

          {/* Difficulty badge */}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              problem.difficulty === "easy"
                ? "text-[var(--kami-green)] border-[var(--kami-green)]/20 bg-[var(--kami-green)]/5"
                : problem.difficulty === "medium"
                ? "text-[var(--kami-amber)] border-[var(--kami-amber)]/20 bg-[var(--kami-amber)]/5"
                : "text-[var(--kami-error)] border-[var(--kami-error)]/20 bg-[var(--kami-error)]/5"
            }`}
          >
            {problem.difficulty}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Run button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border border-[var(--kami-panel-alt)] text-gray-300 hover:text-white hover:border-gray-600 hover:bg-white/[0.03] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            </svg>
            Run
          </button>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            id="submit-button"
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg font-semibold text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--kami-cyan)] text-[var(--kami-bg)] hover:shadow-[0_0_16px_rgba(0,229,255,0.25)] hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-[var(--kami-bg)] animate-spin" />
                Running...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Split Panel ────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Problem Description + Results */}
        <div className="w-[45%] flex flex-col border-r border-[var(--kami-panel-alt)]/40">
          {/* Tabs */}
          <div className="flex border-b border-[var(--kami-panel-alt)]/60 bg-[#0D1117] flex-shrink-0">
            <button
              onClick={() => setActiveTab("description")}
              className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative ${
                activeTab === "description"
                  ? "text-[var(--kami-cyan)]"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Description
              {activeTab === "description" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--kami-cyan)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative ${
                activeTab === "results"
                  ? "text-[var(--kami-cyan)]"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Results
              {submission && (
                <span
                  className={`ml-2 w-2 h-2 rounded-full inline-block ${
                    submission.status === "accepted"
                      ? "bg-[var(--kami-green)]"
                      : submission.status === "pending" || submission.status === "running"
                      ? "bg-[var(--kami-amber)] animate-pulse"
                      : "bg-[var(--kami-error)]"
                  }`}
                />
              )}
              {activeTab === "results" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--kami-cyan)]" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "description" ? (
              <ProblemPanel problem={problem} />
            ) : (
              <div className="h-full p-4">
                <TerminalConsole submission={submission} isLoading={isSubmitting} />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Code Editor */}
        <div className="flex-1 flex flex-col">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#0D1117] border-b border-[var(--kami-panel-alt)]/60 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
              <span className="px-2 py-0.5 rounded bg-[var(--kami-violet)]/10 text-[var(--kami-violet)] border border-[var(--kami-violet)]/20">
                Python 3
              </span>
              <span className="text-gray-700">|</span>
              <span>solution.py</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
              <span>⏱ {problem.time_limit_ms}ms</span>
              <span className="text-gray-700">·</span>
              <span>💾 {Math.round(problem.memory_limit_kb / 1024)}MB</span>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 p-2">
            <CodeEditor value={code} onChange={setCode} language="python" />
          </div>
        </div>
      </div>
    </div>
  );
}
