"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Swords, Loader2, Users, Globe, UserPlus, KeyRound, Copy, Check } from "lucide-react";
import { getCurrentUser } from "@/lib/api";

export default function ArenaLobby() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "connecting" | "waiting" | "waiting_private" | "found">("idle");
  const [mode, setMode] = useState<"select" | "friend" | "join">("select");
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startMatchmaking = async (code: string | null = null) => {
    setStatus("connecting");
    setError("");
    
    try {
      const user = await getCurrentUser();
      const userId = user?.id || "mock-user-id";
      
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const wsBase = apiBase.replace(/^http/, "ws");
      let wsUrl = `${wsBase}/api/arena/ws/${userId}`;
      if (code) {
        wsUrl += `?room_code=${code}`;
      }
      
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        // Will be updated by server messages
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "waiting") {
            setStatus("waiting");
          } else if (data.type === "waiting_private") {
            setStatus("waiting_private");
            setRoomCode(data.room_code);
          } else if (data.type === "match_found" || data.type === "reconnected") {
            setStatus("found");
            setTimeout(() => {
              ws.close();
              router.push(`/arena/${data.match_id}`);
            }, 1000);
          }
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      ws.onerror = (e) => {
        console.error("WS Error", e);
        setError("Failed to connect to matchmaking server.");
        setStatus("idle");
      };

      ws.onclose = () => {
        if (status !== "found" && socketRef.current === ws) {
          setStatus("idle");
        }
      };
    } catch (err) {
      setError("Please log in before entering the Arena.");
      setStatus("idle");
    }
  };

  const handleCreateFriendMatch = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    startMatchmaking(code);
  };

  const handleJoinFriendMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    startMatchmaking(inputCode.trim().toUpperCase());
  };

  const cancelMatchmaking = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus("idle");
    setMode("select");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 select-none animate-fade">
      <div className="max-w-md w-full bg-secondary-background border-4 border-black p-8 shadow-[6px_6px_0px_0px_#000] flex flex-col items-center text-center">
        
        <div className="w-16 h-16 bg-[#f85149] rounded-full flex items-center justify-center border-4 border-black shadow-[2px_2px_0px_0px_#000] mb-6">
          <Swords className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-3xl font-black mb-2 uppercase tracking-tight">The Arena</h1>
        <p className="text-xs font-bold text-muted-foreground mb-8">
          Face off against another coder in real-time. First to pass all test cases wins.
        </p>

        {error && (
          <div className="w-full bg-[#f85149]/10 text-[#f85149] border-2 border-[#f85149] p-3 text-xs font-bold mb-6">
            {error}
          </div>
        )}

        {status === "idle" && mode === "select" && (
          <div className="w-full space-y-4">
            <button
              onClick={() => startMatchmaking(null)}
              className="w-full bg-main text-main-foreground py-4 text-sm font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center justify-center gap-2"
            >
              <Globe className="w-5 h-5" />
              Play Online
            </button>
            <button
              onClick={() => setMode("friend")}
              className="w-full bg-background text-foreground py-4 text-sm font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Play a Friend
            </button>
          </div>
        )}

        {status === "idle" && mode === "friend" && (
          <div className="w-full space-y-4">
            <button
              onClick={handleCreateFriendMatch}
              className="w-full bg-main text-main-foreground py-4 text-sm font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Create Match
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full bg-background text-foreground py-4 text-sm font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-5 h-5" />
              Join Match
            </button>
            <button
              onClick={() => setMode("select")}
              className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 mt-2"
            >
              Back
            </button>
          </div>
        )}

        {status === "idle" && mode === "join" && (
          <form onSubmit={handleJoinFriendMatch} className="w-full space-y-4">
            <input
              type="text"
              placeholder="ENTER ROOM CODE"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="w-full bg-background text-foreground py-4 px-4 text-center text-sm font-black uppercase tracking-widest border-2 border-black outline-none focus:border-main placeholder:text-muted-foreground/50"
              maxLength={6}
            />
            <button
              type="submit"
              disabled={!inputCode.trim()}
              className="w-full bg-main text-main-foreground py-4 text-sm font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join
            </button>
            <button
              type="button"
              onClick={() => setMode("friend")}
              className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 mt-2"
            >
              Back
            </button>
          </form>
        )}

        {status === "connecting" && (
          <div className="w-full bg-secondary-background text-foreground py-4 text-sm font-black uppercase tracking-widest border-2 border-black flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting...
          </div>
        )}

        {status === "waiting" && (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="w-full bg-background text-foreground py-4 text-sm font-black uppercase tracking-widest border-2 border-black flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-main" />
              Searching for Opponent
            </div>
            <button
              onClick={cancelMatchmaking}
              className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Cancel Matchmaking
            </button>
          </div>
        )}

        {status === "waiting_private" && (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Waiting for friend to join...
            </div>
            <div className="w-full bg-background border-2 border-black p-4 flex flex-col items-center gap-3 relative">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Room Code</span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black tracking-widest text-main">{roomCode}</span>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-secondary-background rounded border-2 border-transparent hover:border-black transition-all group relative"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-5 h-5 text-[#8bd600]" /> : <Copy className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />}
                </button>
              </div>
            </div>
            <button
              onClick={cancelMatchmaking}
              className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Cancel Match
            </button>
          </div>
        )}

        {status === "found" && (
          <div className="w-full bg-[#8bd600] text-black py-4 text-sm font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center gap-3 animate-pulse">
            <Swords className="w-5 h-5" />
            Match Found!
          </div>
        )}

      </div>
    </div>
  );
}
