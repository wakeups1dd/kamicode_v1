"use client";

import { useEffect } from "react";
import { AlertTriangle, AlertCircle, X, Check } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  isDestructive = false,
  hideCancel = false,
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !hideCancel) onCancel();
        if (e.key === "Enter") onConfirm();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onCancel, onConfirm, hideCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}>
      <div 
        className="w-full max-w-sm rounded-xl overflow-hidden m-4 relative animate-in zoom-in-95 border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-secondary-background"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Matches the website's thick black borders */}
        <div className={`flex items-center justify-between p-4 border-b-4 border-black ${isDestructive ? 'bg-[#f85149]' : 'bg-main'}`}>
          <div className="flex items-center gap-2">
            {isDestructive ? (
              <AlertTriangle className="w-5 h-5 text-black" strokeWidth={2.5} />
            ) : (
              <AlertCircle className="w-5 h-5 text-white" />
            )}
            <h2 className={`text-lg font-black tracking-tight ${isDestructive ? 'text-black uppercase' : 'text-white'}`}>
              {title}
            </h2>
          </div>
          <button onClick={onCancel} className={`p-1 rounded border-2 border-transparent transition-all ${isDestructive ? 'hover:border-black hover:bg-black/10' : 'hover:border-black hover:bg-black/10'}`}>
            <X className={`w-5 h-5 ${isDestructive ? 'text-black' : 'text-white'}`} />
          </button>
        </div>
        
        {/* Content Body */}
        <div className="p-6">
          <p className="font-bold text-sm text-foreground leading-relaxed">{message}</p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t-4 border-black bg-background flex justify-end gap-3">
          {!hideCancel && (
            <button 
              onClick={onCancel} 
              className="px-4 py-2 text-sm font-black bg-secondary-background text-foreground border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] transition-all rounded-xl"
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={onConfirm} 
            className={`px-4 py-2 text-sm font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] transition-all rounded-xl flex items-center gap-2 ${
              isDestructive 
                ? 'bg-[#f85149] text-white' 
                : 'bg-main text-main-foreground'
            }`}
          >
            <Check className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
