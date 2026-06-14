"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Swords, Loader2, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/api";

export default function ArenaLobby() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "connecting" | "waiting" | "found">("idle");
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const startMatchmaking = async () => {
    setStatus("connecting");
    setError("");
    
    try {
      // For local dev, we fetch a mock user
      const user = await getCurrentUser();
      const userId = user?.id || "mock-user-id";
      
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const wsBase = apiBase.replace(/^http/, "ws");
      const wsUrl = `${wsBase}/api/arena/ws/${userId}`;
      
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("waiting");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "waiting") {
            setStatus("waiting");
          } else if (data.type === "match_found" || data.type === "reconnected") {
            setStatus("found");
            setTimeout(() => {
              // Disconnect here, the battle page will reconnect
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
        if (status !== "found") {
          setStatus("idle");
        }
      };
    } catch (err) {
      setError("Please log in before entering the Arena.");
      setStatus("idle");
    }
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

        {status === "idle" && (
          <button
            onClick={startMatchmaking}
            className="w-full bg-main text-main-foreground py-4 text-sm font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Find Match
          </button>
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
              onClick={() => {
                socketRef.current?.close();
                setStatus("idle");
              }}
              className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Cancel Matchmaking
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
