"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export default function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // In a real app we might pass the query as a URL param
      router.push("/problems");
      onClose();
      setQuery("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-secondary-background border-4 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-xl rounded-xl overflow-hidden m-4 relative animate-in slide-in-from-top-4 zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSearch} className="flex items-center border-b-4 border-black bg-white">
          <div className="pl-4">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for problems, topics, or users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-4 text-lg font-bold bg-transparent outline-none text-black placeholder-muted-foreground"
          />
          <button type="button" onClick={onClose} className="pr-4 hover:text-black text-muted-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </form>
        
        <div className="p-4 bg-secondary-background">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">Quick Links</p>
          <div className="space-y-2">
            <button onClick={() => { router.push("/problems"); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-transparent hover:border-black hover:bg-main hover:text-main-foreground transition-colors font-bold text-sm text-left">
              Browse all problems
            </button>
            <button onClick={() => { router.push("/leaderboard"); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-transparent hover:border-black hover:bg-main hover:text-main-foreground transition-colors font-bold text-sm text-left">
              View Leaderboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
