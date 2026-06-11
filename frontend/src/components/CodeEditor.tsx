"use client";

import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

export default function CodeEditor({
  value,
  onChange,
  language = "python",
  readOnly = false,
}: CodeEditorProps) {
  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-[var(--kami-panel-alt)]">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(val) => onChange(val || "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "var(--font-geist-mono), 'Fira Code', 'JetBrains Mono', monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 16 },
          readOnly,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          renderLineHighlight: "gutter",
          bracketPairColorization: { enabled: true },
        }}
        beforeMount={(monaco) => {
          // Define KamiCode dark theme
          monaco.editor.defineTheme("kami-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
              { token: "comment", foreground: "6A7280", fontStyle: "italic" },
              { token: "keyword", foreground: "8B5CF6" },
              { token: "string", foreground: "00FF9D" },
              { token: "number", foreground: "F59E0B" },
              { token: "type", foreground: "00E5FF" },
            ],
            colors: {
              "editor.background": "#0B0F14",
              "editor.foreground": "#F8FAFC",
              "editor.lineHighlightBackground": "#111827",
              "editor.selectionBackground": "#172033",
              "editorCursor.foreground": "#00E5FF",
              "editorLineNumber.foreground": "#4B5563",
              "editorLineNumber.activeForeground": "#00E5FF",
              "editorWidget.background": "#111827",
              "editorWidget.border": "#172033",
            },
          });
        }}
        onMount={(editor, monaco) => {
          monaco.editor.setTheme("kami-dark");
        }}
      />
    </div>
  );
}
