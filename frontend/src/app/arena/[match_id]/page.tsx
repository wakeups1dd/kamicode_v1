"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { getProblem, submitCode, getCurrentUser, getAIAnalysis, getSubmission } from "@/lib/api";
import type { ProblemDetail, SubmissionResponse, AIAnalysisResponse } from "@/lib/types";

import ProblemPanel from "@/components/ProblemPanel";
import CodeEditor from "@/components/CodeEditor";
import TerminalConsole from "@/components/TerminalConsole";
import AIAnalysisCard from "@/components/AIAnalysisCard";
import { Loader2, Swords, Trophy, Activity, LogOut } from "lucide-react";

export default function ArenaBattle({ params }: { params: Promise<{ match_id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.match_id;

  const [userId, setUserId] = useState<string>("");
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [sourceCode, setSourceCode] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [language, setLanguage] = useState<"python" | "javascript" | "cpp" | "java">("python");

  const defaultSnippets = {
    python: "# Write your solution here\n",
    javascript: "function solve() {\n  // Write your solution here\n}\n",
    cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n  // Write your solution here\n  return 0;\n}\n",
    java: "public class Main {\n  public static void main(String[] args) {\n    // Write your solution here\n  }\n}\n"
  };

  const handleLanguageChange = (newLang: "python" | "javascript" | "cpp" | "java") => {
    setLanguage(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("kamicode_preferred_language", newLang);
    }
    setSourceCode(newLang === "python" ? (problem?.starter_code || defaultSnippets.python) : defaultSnippets[newLang]);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("kamicode_preferred_language");
      if (savedLang && ["python", "javascript", "cpp", "java"].includes(savedLang)) {
        setLanguage(savedLang as any);
      }
    }
  }, []);

  // Arena State
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [opponentStatus, setOpponentStatus] = useState<"Waiting" | "Coding..." | "Evaluating tests..." | "Finished!" | "Disconnected">("Waiting");
  const [opponentPassed, setOpponentPassed] = useState(0);
  const [opponentTotal, setOpponentTotal] = useState(0);
  const [matchResult, setMatchResult] = useState<"won" | "lost" | "draw" | null>(null);
  const [eloDelta, setEloDelta] = useState<number | null>(null);
  const [disconnectWarning, setDisconnectWarning] = useState<string | null>(null);

  // Terminal & AI State
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<{
    status: "idle" | "running" | "success" | "error";
    data?: any;
    error?: string;
  }>({ status: "idle" });
  
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let socket: WebSocket;
    let pingInterval: NodeJS.Timeout;

    const initArena = async () => {
      try {
        const user = await getCurrentUser();
        const uId = user?.id || "mock-user-id";
        setUserId(uId);

        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const wsBase = apiBase.replace(/^http/, "ws");
        const wsUrl = `${wsBase}/api/arena/ws/${uId}`;
        
        socket = new WebSocket(wsUrl);
        setWs(socket);

        socket.onopen = () => {
          setConnectionStatus("connected");
          // Start 10s ping heartbeat
          pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "ping" }));
            }
          }, 10000);
        };
        
        socket.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === "reconnected" || data.type === "match_found" || data.type === "match_start") {
            const probSlug = data.problem_slug;
            if (probSlug) {
              const p = await getProblem(probSlug);
              setProblem(p);
              setSourceCode(p.starter_code || "");
            }
          }
          else if (data.type === "opponent_event") {
            if (data.event === "typing") setOpponentStatus("Coding...");
            if (data.event === "evaluating") setOpponentStatus("Evaluating tests...");
          }
          else if (data.type === "opponent_evaluated") {
            setOpponentPassed(data.passed_count);
            setOpponentTotal(data.total_count);
            if (data.status === "accepted") {
               setOpponentStatus("Finished!");
            } else {
               setOpponentStatus("Coding...");
            }
          }
          else if (data.type === "player_disconnected") {
            setOpponentStatus("Disconnected");
            setDisconnectWarning(`Opponent disconnected. 30s reconnect window active.`);
          }
          else if (data.type === "player_reconnected") {
            setOpponentStatus("Coding...");
            setDisconnectWarning(null);
          }
          else if (data.type === "anticheat_warning") {
            setDisconnectWarning(`Opponent triggered anti-cheat telemetry: ${data.event.replace('_', ' ')}.`);
            setTimeout(() => setDisconnectWarning(null), 5000);
          }
          else if (data.type === "match_ended") {
            if (data.winner_id === uId) {
              setMatchResult("won");
            } else {
              setMatchResult("lost");
            }
            if (data.elo && data.elo[uId]) {
              setEloDelta(data.elo[uId].delta);
            }
            setDisconnectWarning(null);
            socket.close();
          }
        };

        const handleVisibilityChange = () => {
          if (document.hidden && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "anticheat_event", event: "tab_switch" }));
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        socket.onclose = () => {
          setConnectionStatus("disconnected");
          clearInterval(pingInterval);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
      } catch (err) {
        console.error(err);
      }
    };

    initArena();

    return () => {
      clearInterval(pingInterval);
      if (socket) socket.close();
    };
  }, [matchId]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      const prevLen = sourceCode.length;
      const newLen = value.length;
      // Detect large paste (>100 characters in a single stroke)
      if (newLen - prevLen > 100 && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "anticheat_event",
          event: "large_paste",
          details: `Pasted ${newLen - prevLen} chars`,
        }));
      }

      setSourceCode(value);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "typing" }));
      }
    }
  };

  const pollAIAnalysis = async (submissionId: string | number) => {
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

  const handleRunCode = async (isSubmit: boolean = false) => {
    if (!problem || isRunning || matchResult) return;
    
    setIsRunning(true);
    setTerminalOutput({ status: "running" });
    setActiveTab("submissions");
    setAiAnalysis(null);
    setIsAnalyzing(false);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "evaluating" }));
    }

    try {
      // Small delay to simulate evaluation UI state
      await new Promise(r => setTimeout(r, 500));
      const result = await submitCode({
        problem_id: problem.id,
        language: language,
        source_code: sourceCode,
      });
      
      // We manually poll for Arena MVP to avoid complex background task syncing on frontend
      let finalResult = result;
      for (let i = 0; i < 15; i++) {
        if (finalResult.status !== "pending" && finalResult.status !== "running") break;
        await new Promise(r => setTimeout(r, 1000));
        const check = await getSubmission(result.id);
        finalResult = check;
      }

      setTerminalOutput({
        status: finalResult.status === "accepted" ? "success" : "error",
        data: finalResult
      });

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "evaluated",
          status: finalResult.status,
          passed_count: finalResult.passed_count || 0,
          total_count: finalResult.total_count || 0
        }));
      }

      if (finalResult.status === "accepted") {
        pollAIAnalysis(result.id);
      }

    } catch (err: any) {
      setTerminalOutput({ status: "error", error: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  const leaveArena = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "leave" }));
    }
    router.push("/arena");
  };

  if (!problem) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center text-foreground gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-main" />
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Initializing Battle...</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col font-sans overflow-hidden">
      
      {/* Top Navigation / Status Bar */}
      <div className="h-14 border-b-4 border-black bg-secondary-background flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={leaveArena}
            className="flex items-center justify-center w-8 h-8 rounded border-2 border-black bg-background text-foreground hover:bg-[#f85149] hover:text-white transition-colors group"
            title="Forfeit Match"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <div className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
            <Swords className="w-4 h-4 text-main" />
            Arena Match
          </div>
        </div>

        {/* Opponent Status HUD */}
        <div className="flex items-center gap-4 bg-background border-2 border-black rounded-xl px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#8bd600] animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground">Opponent:</span>
            <span className="text-xs font-black text-foreground">{opponentStatus}</span>
          </div>
          {opponentTotal > 0 && (
             <div className="text-[10px] font-mono font-bold bg-secondary-background border border-black px-1.5 py-0.5 rounded">
               {opponentPassed}/{opponentTotal} tests
             </div>
          )}
        </div>
      </div>

      {disconnectWarning && (
        <div className="bg-[#ffbf00] text-black border-b-2 border-black px-4 py-1.5 text-xs font-bold text-center">
          ⚠️ {disconnectWarning}
        </div>
      )}

      {/* Main Split Interface */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Problem */}
        <div className="w-1/2 border-r-4 border-black flex flex-col relative">
          
          {/* Match Result Overlay */}
          {matchResult && (
            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade">
              <div className="bg-secondary-background border-4 border-black p-8 shadow-[6px_6px_0px_0px_#000] max-w-sm w-full text-center flex flex-col items-center">
                <Trophy className={`w-16 h-16 mb-4 ${matchResult === 'won' ? 'text-[#ffbf00]' : 'text-muted-foreground'}`} />
                <h2 className="text-3xl font-black uppercase tracking-tight mb-2">
                  {matchResult === 'won' ? 'VICTORY' : 'DEFEAT'}
                </h2>
                <p className="text-xs font-bold text-muted-foreground mb-4">
                  {matchResult === 'won' ? 'You crushed your opponent!' : 'Your opponent solved it first.'}
                </p>
                {eloDelta !== null && (
                  <div className={`text-sm font-black font-mono px-3 py-1 rounded-full border-2 border-black mb-6 ${
                    eloDelta >= 0 ? 'bg-[#8bd600] text-black' : 'bg-[#f85149] text-white'
                  }`}>
                    {eloDelta >= 0 ? `+${eloDelta}` : eloDelta} Elo Rating
                  </div>
                )}
                <button
                  onClick={leaveArena}
                  className="bg-main text-main-foreground w-full py-3 text-sm font-black uppercase border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  Return to Lobby
                </button>
              </div>
            </div>
          )}

          <ProblemPanel problem={problem} />
        </div>

        {/* Right Side: Editor & Console */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-secondary-background border-b-2 border-black flex-shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-foreground">Editor</span>
            <select 
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as any)}
              className="px-2 py-1 rounded-xl bg-[#d67aff] text-black border-2 border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000] outline-none cursor-pointer"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
          </div>
          <div className="flex-1 min-h-0 relative">
            <CodeEditor
              language={language}
              value={sourceCode}
              onChange={handleEditorChange}
            />
          </div>

          <div className="h-[250px] border-t-4 border-black flex flex-col bg-background relative overflow-hidden">
             <div className="absolute top-2 right-4 z-10 flex items-center gap-2">
                <button
                  onClick={() => handleRunCode(true)}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-5 py-1.5 rounded-xl font-black text-xs bg-main text-main-foreground border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
                >
                  {isRunning ? "Running..." : "Submit"}
                </button>
             </div>
             <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-background relative scrollbar-thin">
               {terminalOutput.data || isRunning ? (
                 <div className="h-full flex flex-col p-4 space-y-4">
                   <div className="flex-shrink-0">
                     <TerminalConsole
                       submission={terminalOutput.data || null}
                       isLoading={isRunning}
                     />
                   </div>
                   {(isAnalyzing || aiAnalysis) && (
                     <div className="flex-shrink-0">
                       <AIAnalysisCard analysis={aiAnalysis} loading={isAnalyzing} />
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                   <span className="text-4xl">⌨</span>
                   <span className="text-xs font-mono font-bold uppercase tracking-wider">Click Submit to see results</span>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
