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
    <div className="h-full w-full relative">
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
          scrollbar: {
            verticalScrollbarSize: 14,
            horizontalScrollbarSize: 14,
            verticalSliderSize: 14,
            horizontalSliderSize: 14,
            alwaysConsumeMouseWheel: false,
          },
        }}
        beforeMount={(monaco) => {
          // Define KamiCode Neobrutalist dark theme
          monaco.editor.defineTheme("kami-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
              { token: "comment", foreground: "898095", fontStyle: "italic" },
              { token: "keyword", foreground: "c084fc", fontStyle: "bold" },
              { token: "string", foreground: "8bd600" },
              { token: "number", foreground: "ffbf00" },
              { token: "type", foreground: "7a83ff" },
            ],
            colors: {
              "editor.background": "#191221",
              "editor.foreground": "#e6e6e6",
              "editor.lineHighlightBackground": "#231b2e",
              "editor.selectionBackground": "#c084fc33",
              "editorCursor.foreground": "#c084fc",
              "editorLineNumber.foreground": "#706050",
              "editorLineNumber.activeForeground": "#c084fc",
              "editorWidget.background": "#191221",
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
