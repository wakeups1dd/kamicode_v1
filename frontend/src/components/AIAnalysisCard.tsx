"use client";

import { useState } from "react";
import type { AIAnalysisResponse } from "@/lib/types";
import { CheckCircle2, AlertTriangle, Lightbulb, Clock, Database, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface AIAnalysisCardProps {
  analysis: AIAnalysisResponse | null;
  loading: boolean;
}

export default function AIAnalysisCard({ analysis, loading }: AIAnalysisCardProps) {
  const [showHint, setShowHint] = useState(false);

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-950 border-4 border-black p-6 rounded-xl shadow-[6px_6px_0px_0px_#000] space-y-4 animate-pulse mt-6 select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#a855f7] dark:text-[#c084fc] animate-spin" />
          <span className="font-mono font-bold text-sm text-foreground">AI Coach is analyzing your solution...</span>
        </div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-3/4" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-1/2" />
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  // Helper to color scores
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-[#8bd600] text-black";
    if (score >= 50) return "bg-[#ffbf00] text-black";
    return "bg-[#f85149] text-white";
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_#000] overflow-hidden mt-6 select-none font-sans animate-fade">
      {/* Header bar */}
      <div className="bg-main text-main-foreground border-b-4 border-black px-4.5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 fill-current" />
          <span className="font-mono font-black text-sm uppercase tracking-wider">AI EVALUATION COACH</span>
        </div>
        <span className="font-mono text-xs font-bold bg-white dark:bg-zinc-900 border-2 border-black text-black dark:text-white px-2 py-0.5 rounded-xl">
          v2.0
        </span>
      </div>

      <div className="p-5 md:p-6 space-y-6">
        {/* Complexity & Approach Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-50 dark:bg-zinc-900 border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_0px_#000] flex items-center gap-3">
            <Clock className="w-8 h-8 text-[#a855f7] dark:text-[#c084fc] flex-shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-black text-zinc-500">Time Complexity</div>
              <div className="font-mono font-black text-lg text-foreground">{analysis.time_complexity || "N/A"}</div>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_0px_#000] flex items-center gap-3">
            <Database className="w-8 h-8 text-[#a855f7] dark:text-[#c084fc] flex-shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-black text-zinc-500">Space Complexity</div>
              <div className="font-mono font-black text-lg text-foreground">{analysis.space_complexity || "N/A"}</div>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_0px_#000] flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-[#a855f7] dark:text-[#c084fc] flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-black text-zinc-500">Approach</div>
              <div className="font-sans font-black text-base text-foreground truncate">{analysis.approach || "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Approach Explanation */}
        {analysis.approach_explanation && (
          <div className="bg-[#e2d4f7]/30 dark:bg-[#2f2042]/30 border-2 border-black p-4 rounded-2xl">
            <span className="font-mono font-black text-xs text-[#a855f7] dark:text-[#c084fc] uppercase tracking-wider block mb-1">
              Methodology
            </span>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
              {analysis.approach_explanation}
            </p>
          </div>
        )}

        {/* Score Meters */}
        <div className="space-y-3.5">
          <h3 className="font-mono font-black text-xs uppercase tracking-wider text-zinc-500">Performance Ratings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Efficiency */}
            <div className="border-2 border-black p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-2 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Efficiency</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${getScoreColor(analysis.efficiency_score || 0)}`}>
                  {analysis.efficiency_score}/100
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-3 border border-black rounded-full overflow-hidden">
                <div
                  className="bg-[#8bd600] h-full border-r border-black"
                  style={{ width: `${analysis.efficiency_score || 0}%` }}
                />
              </div>
            </div>

            {/* Quality */}
            <div className="border-2 border-black p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-2 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Code Quality</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${getScoreColor(analysis.code_quality_score || 0)}`}>
                  {analysis.code_quality_score}/100
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-3 border border-black rounded-full overflow-hidden">
                <div
                  className="bg-[#d67aff] h-full border-r border-black"
                  style={{ width: `${analysis.code_quality_score || 0}%` }}
                />
              </div>
            </div>

            {/* Overall */}
            <div className="border-2 border-black p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-2 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Overall Rating</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${getScoreColor(analysis.overall_score || 0)}`}>
                  {analysis.overall_score}/100
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-3 border border-black rounded-full overflow-hidden">
                <div
                  className="bg-main h-full border-r border-black"
                  style={{ width: `${analysis.overall_score || 0}%` }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Strengths */}
          <div className="space-y-2.5">
            <h4 className="font-mono font-black text-xs text-green uppercase tracking-wider">Solution Strengths</h4>
            {analysis.strengths && analysis.strengths.length > 0 ? (
              <ul className="space-y-2">
                {analysis.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#8bd600] flex-shrink-0 mt-0.5" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">No specific strengths annotated.</p>
            )}
          </div>

          {/* Improvements */}
          <div className="space-y-2.5">
            <h4 className="font-mono font-black text-xs text-amber uppercase tracking-wider">Actionable Improvements</h4>
            {analysis.improvements && analysis.improvements.length > 0 ? (
              <ul className="space-y-2">
                {analysis.improvements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    <AlertTriangle className="w-4 h-4 text-[#ffbf00] flex-shrink-0 mt-0.5" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">No optimization suggestions required.</p>
            )}
          </div>
        </div>

        {/* Expandable Optimized Hint */}
        {analysis.optimized_solution_hint && (
          <div className="border-2 border-black rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 shadow-[2px_2px_0px_0px_#000]">
            <button
              onClick={() => setShowHint(!showHint)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-black uppercase text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#ffbf00]" />
                <span>Coach Optimization Hint</span>
              </div>
              {showHint ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showHint && (
              <div className="p-4 border-t-2 border-black text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed font-mono whitespace-pre-wrap">
                {analysis.optimized_solution_hint}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
