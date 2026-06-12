"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getProblem, submitCode, pollSubmission, getAIAnalysis } from "@/lib/api";
import type { ProblemDetail, SubmissionResponse, AIAnalysisResponse } from "@/lib/types";
import ProblemPanel from "@/components/ProblemPanel";
import TerminalConsole from "@/components/TerminalConsole";
import AIAnalysisCard from "@/components/AIAnalysisCard";

// Dynamic import for Monaco to avoid SSR issues
const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-background rounded-[6px] border-2 border-black">
      <div className="w-6 h-6 rounded-full border-4 border-transparent border-t-main animate-spin" />
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

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    getProblem(slug)
      .then((p) => {
        setProblem(p);
        const savedCode = typeof window !== "undefined" ? localStorage.getItem(`kamicode_code_${p.slug}`) : null;
        setCode(savedCode || p.starter_code || "# Write your solution here\n");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Save code to localStorage on edit
  useEffect(() => {
    if (problem && code) {
      localStorage.setItem(`kamicode_code_${problem.slug}`, code);
    }
  }, [code, problem]);

  const pollAIAnalysis = async (submissionId: number) => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const maxRetries = 20;
    const intervalMs = 2000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const analysis = await getAIAnalysis(submissionId);
        if (analysis && analysis.time_complexity) {
          setAiAnalysis(analysis);
          setIsAnalyzing(false);
          return;
        }
      } catch (err) {
        // AI analysis is still processing
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = async () => {
    if (!problem || isSubmitting) return;

    setIsSubmitting(true);
    setActiveTab("results");
    setSubmission(null);
    setAiAnalysis(null);
    setIsAnalyzing(false);

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

      if (result.status === "accepted") {
        pollAIAnalysis(sub.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-transparent border-t-main animate-spin" />
          <span className="text-xs text-muted-foreground font-mono font-bold">Loading problem...</span>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="bg-[#f85149]/10 border-2 border-black rounded-[6px] p-6 text-foreground font-bold max-w-md text-center shadow-[3px_3px_0px_0px_#000]">
          {error || "Problem not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden text-foreground">
      {/* ── Compact Top Bar ──────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 bg-secondary-background border-b-4 border-black flex-shrink-0">
        <div className="flex items-center gap-3.5">
          {/* Back to problems */}
          <Link
            href="/problems"
            className="flex items-center gap-1 px-3 py-1 border-2 border-black rounded-[6px] bg-background text-foreground hover:bg-main hover:text-main-foreground shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all text-xs font-black"
          >
            <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </Link>

          <div className="w-1 h-5 bg-black" />

          {/* Problem title */}
          <h2 className="text-sm font-black text-foreground truncate max-w-[240px] md:max-w-[340px]">
            {problem.title}
          </h2>

          {/* Difficulty badge */}
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border-2 border-black shadow-[1px_1px_0px_0px_#000] ${
              problem.difficulty === "easy"
                ? "bg-[#8bd600] text-black"
                : problem.difficulty === "medium"
                ? "bg-[#ffbf00] text-black"
                : "bg-[#f85149] text-white"
            }`}
          >
            {problem.difficulty}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Run button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] text-xs font-black bg-secondary-background text-foreground border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Run
          </button>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            id="submit-button"
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-[6px] font-black text-xs bg-main text-main-foreground border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-black animate-spin" />
                Running...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="w-[45%] flex flex-col border-r-4 border-black">
          {/* Tabs - folder style */}
          <div className="flex border-b-4 border-black bg-secondary-background flex-shrink-0 px-3 pt-3.5 gap-1.5">
            <button
              onClick={() => setActiveTab("description")}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-t-[6px] border-2 border-black ${
                activeTab === "description"
                  ? "bg-background text-foreground border-b-transparent -mb-[4px] z-10"
                  : "bg-background/40 text-foreground/60 border-b-black hover:bg-background/80"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-t-[6px] border-2 border-black flex items-center ${
                activeTab === "results"
                  ? "bg-background text-foreground border-b-transparent -mb-[4px] z-10"
                  : "bg-background/40 text-foreground/60 border-b-black hover:bg-background/80"
              }`}
            >
              <span>Results</span>
              {submission && (
                <span
                  className={`ml-2 w-2.5 h-2.5 rounded-full border border-black inline-block ${
                    submission.status === "accepted"
                      ? "bg-[#8bd600]"
                      : submission.status === "pending" || submission.status === "running"
                      ? "bg-[#ffbf00] animate-pulse"
                      : "bg-[#f85149]"
                  }`}
                />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "description" ? (
              <ProblemPanel problem={problem} />
            ) : (
              <div className="h-full overflow-y-auto p-4 bg-background space-y-4 scrollbar-thin">
                <TerminalConsole submission={submission} isLoading={isSubmitting} />
                {(isAnalyzing || aiAnalysis) && (
                  <AIAnalysisCard analysis={aiAnalysis} loading={isAnalyzing} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Code Editor */}
        <div className="flex-1 flex flex-col">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-secondary-background border-b-4 border-black flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-foreground font-bold">
              <span className="px-2.5 py-0.5 rounded-[4px] bg-[#d67aff] text-black border-2 border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
                Python 3
              </span>
              <span className="text-black font-black">|</span>
              <span>solution.py</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono font-bold">
              <span>⏱ {problem.time_limit_ms}ms</span>
              <span className="text-black font-black">·</span>
              <span>💾 {Math.round(problem.memory_limit_kb / 1024)}MB</span>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 p-3.5 bg-background">
            <CodeEditor value={code} onChange={setCode} language="python" />
          </div>
        </div>
      </div>
    </div>
  );
}
