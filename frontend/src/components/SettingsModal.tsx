"use client";

import { useEffect, useState } from "react";
import { X, Moon, Bell, Volume2, Key } from "lucide-react";

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [vimMode, setVimMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-secondary-background border-4 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md rounded-xl overflow-hidden m-4 relative animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b-4 border-black bg-main">
          <h2 className="text-xl font-black text-main-foreground tracking-tight">Preferences</h2>
          <button onClick={onClose} className="p-1 hover:bg-black/10 rounded border-2 border-transparent hover:border-black transition-all">
            <X className="w-5 h-5 text-main-foreground" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Setting toggle 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000]">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-sm">Sound Effects</p>
                <p className="text-xs font-bold text-muted-foreground">Play sounds on success/error</p>
              </div>
            </div>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full border-2 border-black flex items-center px-1 transition-colors ${soundEnabled ? 'bg-[#8bd600]' : 'bg-zinc-300'}`}
            >
              <div className={`w-3 h-3 bg-black rounded-full transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Setting toggle 2 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000]">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-sm">Notifications</p>
                <p className="text-xs font-bold text-muted-foreground">League updates & daily reminders</p>
              </div>
            </div>
            <button 
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full border-2 border-black flex items-center px-1 transition-colors ${notifications ? 'bg-[#8bd600]' : 'bg-zinc-300'}`}
            >
              <div className={`w-3 h-3 bg-black rounded-full transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Setting toggle 3 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000]">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-sm">Vim Keybindings</p>
                <p className="text-xs font-bold text-muted-foreground">Enable Vim mode in code editor</p>
              </div>
            </div>
            <button 
              onClick={() => setVimMode(!vimMode)}
              className={`w-12 h-6 rounded-full border-2 border-black flex items-center px-1 transition-colors ${vimMode ? 'bg-[#8bd600]' : 'bg-zinc-300'}`}
            >
              <div className={`w-3 h-3 bg-black rounded-full transition-transform ${vimMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="p-4 border-t-4 border-black bg-background flex justify-end">
          <button onClick={onClose} className="px-4 py-2 font-black text-sm bg-secondary-background border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] transition-all rounded-xl">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
