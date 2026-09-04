"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { listProblems, getProblem } from "@/lib/api";
import type { ProblemSummary, ProblemDetail } from "@/lib/types";
import {
  Plus,
  Save,
  Trash2,
  Code,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  ArrowLeft,
  FileText,
  Clock,
  HardDrive
} from "lucide-react";
import Link from "next/link";

export default function AdminProblemsPage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState<Partial<ProblemDetail> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "examples" | "testcases" | "starter">("details");

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [topic, setTopic] = useState("arrays");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [description, setDescription] = useState("");
  const [constraints, setConstraints] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitKb, setMemoryLimitKb] = useState(256000);
  const [starterCode, setStarterCode] = useState("");

  const [examples, setExamples] = useState<Array<{ input: string; output: string; explanation?: string }>>([
    { input: "", output: "", explanation: "" }
  ]);
  const [testCases, setTestCases] = useState<Array<{ input: string; expected_output: string; is_hidden?: boolean }>>([
    { input: "", expected_output: "", is_hidden: false }
  ]);

  // Test Runner State
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const data = await listProblems();
      setProblems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleSelectProblem = async (p: ProblemSummary) => {
    setIsCreating(false);
    setSaveStatus(null);
    try {
      const full = await getProblem(p.slug);
      setSelectedProblem(full);
      setTitle(full.title);
      setSlug(full.slug);
      setTopic(full.topic);
      setDifficulty((full.difficulty as "easy" | "medium" | "hard") || "easy");
      setDescription(full.description || "");
      setConstraints(Array.isArray(full.constraints) ? full.constraints.join("\n") : full.constraints || "");
      setTimeLimitMs(full.time_limit_ms || 2000);
      setMemoryLimitKb(full.memory_limit_kb || 256000);
      setStarterCode(full.starter_code || "");
      setExamples(full.examples && full.examples.length > 0 ? full.examples : [{ input: "", output: "", explanation: "" }]);
      setTestCases(full.test_cases && full.test_cases.length > 0 ? full.test_cases : [{ input: "", expected_output: "", is_hidden: false }]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewProblem = () => {
    setSelectedProblem(null);
    setIsCreating(true);
    setTitle("");
    setSlug("");
    setTopic("arrays");
    setDifficulty("easy");
    setDescription("");
    setConstraints("1 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9");
    setTimeLimitMs(2000);
    setMemoryLimitKb(256000);
    setStarterCode("# Read input from stdin\nnums = list(map(int, input().split()))\n\n# Your solution here\n");
    setExamples([{ input: "1 2\n3", output: "3", explanation: "Sample explanation" }]);
    setTestCases([
      { input: "1 2\n3", expected_output: "3", is_hidden: false },
      { input: "4 5\n9", expected_output: "9", is_hidden: true }
    ]);
    setSaveStatus(null);
  };

  const handleSave = async () => {
    setSaveStatus("Saving problem...");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const payload = {
        title,
        slug,
        topic,
        difficulty,
        description,
        constraints: constraints.split("\n").filter(c => c.trim()),
        examples: examples.filter(e => e.input.trim() || e.output.trim()),
        test_cases: testCases.filter(tc => tc.input.trim() || tc.expected_output.trim()),
        starter_code: starterCode,
        time_limit_ms: Number(timeLimitMs),
        memory_limit_kb: Number(memoryLimitKb),
      };

      const token = localStorage.getItem("clerk_token") || "mock-token";
      const url = isCreating || !selectedProblem?.id
        ? `${apiBase}/api/problems/`
        : `${apiBase}/api/problems/${selectedProblem.id}`;

      const method = isCreating || !selectedProblem?.id ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Save failed" }));
        throw new Error(errorData.detail || "Failed to save problem");
      }

      setSaveStatus("Saved successfully!");
      fetchProblems();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`Error: ${err.message}`);
    }
  };

  const addExample = () => setExamples([...examples, { input: "", output: "", explanation: "" }]);
  const removeExample = (idx: number) => setExamples(examples.filter((_, i) => i !== idx));

  const addTestCase = () => setTestCases([...testCases, { input: "", expected_output: "", is_hidden: false }]);
  const removeTestCase = (idx: number) => setTestCases(testCases.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b-4 border-black bg-secondary-background px-6 py-4 flex items-center justify-between shadow-[0_4px_0_0_#000]">
        <div className="flex items-center gap-3">
          <Link href="/problems" className="p-2 border-2 border-black rounded-lg bg-background hover:bg-main transition-colors shadow-[2px_2px_0_0_#000]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-main" /> Problem Management Portal
            </h1>
            <p className="text-xs font-bold text-muted-foreground">Admin Content & Quality Control Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNewProblem}
            className="flex items-center gap-2 px-4 py-2 bg-main text-main-foreground font-black text-xs uppercase border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <Plus className="w-4 h-4" /> New Problem
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-[#8bd600] text-black font-black text-xs uppercase border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <Save className="w-4 h-4" /> Save Problem
          </button>
        </div>
      </header>

      {saveStatus && (
        <div className={`py-2 px-6 text-xs font-black uppercase tracking-wider text-center border-b-2 border-black ${
          saveStatus.includes("Error") ? "bg-[#f85149] text-white" : "bg-[#8bd600] text-black"
        }`}>
          {saveStatus}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Problem Catalog List */}
        <div className="w-80 border-r-4 border-black bg-secondary-background flex flex-col">
          <div className="p-4 border-b-2 border-black font-black text-xs uppercase tracking-wider flex items-center justify-between">
            <span>Problem Catalog ({problems.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {problems.map(p => (
              <div
                key={p.id}
                onClick={() => handleSelectProblem(p)}
                className={`p-3 rounded-xl border-2 border-black cursor-pointer transition-all ${
                  selectedProblem?.id === p.id && !isCreating
                    ? "bg-main text-main-foreground shadow-[3px_3px_0_0_#000] translate-x-1"
                    : "bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-[1.5px_1.5px_0_0_#000]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-black truncate">{p.title}</span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-black ${
                    p.difficulty === "easy" ? "bg-[#8bd600] text-black" : p.difficulty === "medium" ? "bg-[#ffbf00] text-black" : "bg-[#f85149] text-white"
                  }`}>
                    {p.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono opacity-80">
                  <span>{p.topic}</span>
                  <span>•</span>
                  <span>{p.slug}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Problem Editor */}
        <div className="flex-1 flex flex-col bg-background overflow-y-auto p-6 scrollbar-thin space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b-2 border-black pb-3">
            {[
              { id: "details", label: "General Details", icon: FileText },
              { id: "examples", label: `Examples (${examples.length})`, icon: CheckCircle2 },
              { id: "testcases", label: `Test Cases (${testCases.length})`, icon: Layers },
              { id: "starter", label: "Starter Code & Limits", icon: Code },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 font-black text-xs uppercase border-2 border-black rounded-xl transition-all ${
                    activeTab === tab.id
                      ? "bg-main text-main-foreground shadow-[2px_2px_0_0_#000]"
                      : "bg-secondary-background hover:bg-background shadow-[1px_1px_0_0_#000]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: General Details */}
          {activeTab === "details" && (
            <div className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Problem Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Trapping Rain Water"
                    className="w-full bg-secondary-background border-2 border-black p-2.5 rounded-xl font-bold text-xs shadow-[2px_2px_0_0_#000] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Slug (URL identifier)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. trapping-rain-water"
                    className="w-full bg-secondary-background border-2 border-black p-2.5 rounded-xl font-mono text-xs shadow-[2px_2px_0_0_#000] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Topic Category</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-secondary-background border-2 border-black p-2.5 rounded-xl font-bold text-xs shadow-[2px_2px_0_0_#000] outline-none"
                  >
                    <option value="arrays">Arrays</option>
                    <option value="strings">Strings</option>
                    <option value="two-pointers">Two Pointers</option>
                    <option value="stacks">Stacks & Queues</option>
                    <option value="binary-search">Binary Search</option>
                    <option value="dynamic-programming">Dynamic Programming</option>
                    <option value="sorting">Sorting & Intervals</option>
                    <option value="backtracking">Backtracking</option>
                    <option value="logic">Logic & Math</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Difficulty Tier</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-secondary-background border-2 border-black p-2.5 rounded-xl font-bold text-xs shadow-[2px_2px_0_0_#000] outline-none"
                  >
                    <option value="easy">Easy (800 - 1200)</option>
                    <option value="medium">Medium (1300 - 1700)</option>
                    <option value="hard">Hard (1800+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Problem Description (Markdown formatted)</label>
                <textarea
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe problem inputs, rules, and objective..."
                  className="w-full bg-secondary-background border-2 border-black p-3 rounded-xl font-medium text-xs shadow-[2px_2px_0_0_#000] outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Constraints (one per line)</label>
                <textarea
                  rows={3}
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="1 <= n <= 10^5&#10;-10^9 <= nums[i] <= 10^9"
                  className="w-full bg-secondary-background border-2 border-black p-3 rounded-xl font-mono text-xs shadow-[2px_2px_0_0_#000] outline-none"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Examples */}
          {activeTab === "examples" && (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase">Sample Problem Examples</span>
                <button
                  onClick={addExample}
                  className="px-3 py-1 bg-main text-main-foreground font-black text-xs rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000]"
                >
                  + Add Example
                </button>
              </div>

              {examples.map((ex, idx) => (
                <div key={idx} className="bg-secondary-background border-2 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000] space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-main">Example {idx + 1}</span>
                    {examples.length > 1 && (
                      <button onClick={() => removeExample(idx)} className="text-[#f85149] hover:opacity-80">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase">Input</label>
                      <textarea
                        rows={2}
                        value={ex.input}
                        onChange={(e) => {
                          const next = [...examples];
                          next[idx].input = e.target.value;
                          setExamples(next);
                        }}
                        className="w-full bg-background border border-black p-2 rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase">Output</label>
                      <textarea
                        rows={2}
                        value={ex.output}
                        onChange={(e) => {
                          const next = [...examples];
                          next[idx].output = e.target.value;
                          setExamples(next);
                        }}
                        className="w-full bg-background border border-black p-2 rounded font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase">Explanation (Optional)</label>
                    <input
                      type="text"
                      value={ex.explanation || ""}
                      onChange={(e) => {
                        const next = [...examples];
                        next[idx].explanation = e.target.value;
                        setExamples(next);
                      }}
                      className="w-full bg-background border border-black p-2 rounded text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Test Cases */}
          {activeTab === "testcases" && (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase">Execution Test Suite</span>
                  <p className="text-[10px] text-muted-foreground font-bold">Hidden test cases are masked during evaluation.</p>
                </div>
                <button
                  onClick={addTestCase}
                  className="px-3 py-1 bg-main text-main-foreground font-black text-xs rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000]"
                >
                  + Add Test Case
                </button>
              </div>

              {testCases.map((tc, idx) => (
                <div key={idx} className="bg-secondary-background border-2 border-black p-4 rounded-xl shadow-[3px_3px_0_0_#000] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase">Test Case {idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.is_hidden || false}
                          onChange={(e) => {
                            const next = [...testCases];
                            next[idx].is_hidden = e.target.checked;
                            setTestCases(next);
                          }}
                          className="rounded"
                        />
                        <span>Hidden Test</span>
                      </label>
                      {testCases.length > 1 && (
                        <button onClick={() => removeTestCase(idx)} className="text-[#f85149]">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase">Stdin Input</label>
                      <textarea
                        rows={2}
                        value={tc.input}
                        onChange={(e) => {
                          const next = [...testCases];
                          next[idx].input = e.target.value;
                          setTestCases(next);
                        }}
                        className="w-full bg-background border border-black p-2 rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase">Expected Stdout</label>
                      <textarea
                        rows={2}
                        value={tc.expected_output}
                        onChange={(e) => {
                          const next = [...testCases];
                          next[idx].expected_output = e.target.value;
                          setTestCases(next);
                        }}
                        className="w-full bg-background border border-black p-2 rounded font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Starter Code & Limits */}
          {activeTab === "starter" && (
            <div className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Time Limit (ms)
                  </label>
                  <input
                    type="number"
                    value={timeLimitMs}
                    onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                    className="w-full bg-secondary-background border-2 border-black p-2.5 rounded-xl font-mono text-xs shadow-[2px_2px_0_0_#000] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4" /> Memory Limit (KB)
                  </label>
                  <input
                    type="number"
                    value={memoryLimitKb}
                    onChange={(e) => setMemoryLimitKb(Number(e.target.value))}
                    className="w-full bg-secondary-background border-2 border-black p-2.5 rounded-xl font-mono text-xs shadow-[2px_2px_0_0_#000] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Starter Code Template (Python 3)</label>
                <textarea
                  rows={10}
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  className="w-full bg-secondary-background border-2 border-black p-3 rounded-xl font-mono text-xs shadow-[2px_2px_0_0_#000] outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
