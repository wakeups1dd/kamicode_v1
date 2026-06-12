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
    <div className="h-full w-full rounded-[6px] overflow-hidden border-2 border-black shadow-[3px_3px_0px_0px_#000]">
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
          // Define KamiCode Neobrutalist dark theme
          monaco.editor.defineTheme("kami-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
              { token: "comment", foreground: "8a7665", fontStyle: "italic" },
              { token: "keyword", foreground: "eb6d00", fontStyle: "bold" },
              { token: "string", foreground: "8bd600" },
              { token: "number", foreground: "ffbf00" },
              { token: "type", foreground: "7a83ff" },
            ],
            colors: {
              "editor.background": "#1f1f1f",
              "editor.foreground": "#e6e6e6",
              "editor.lineHighlightBackground": "#282828",
              "editor.selectionBackground": "#eb6d0033",
              "editorCursor.foreground": "#eb6d00",
              "editorLineNumber.foreground": "#706050",
              "editorLineNumber.activeForeground": "#eb6d00",
              "editorWidget.background": "#1f1f1f",
              "editorWidget.border": "#000000",
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
