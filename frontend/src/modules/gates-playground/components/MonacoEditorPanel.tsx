import React, { useRef, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type * as MonacoEditorTypes from 'monaco-editor';
import { useTheme } from '@/context/ThemeContext';

export type EditorLanguage = 'qasm' | 'python';

interface MonacoEditorPanelProps {
  code: string;
  onChange: (value: string | undefined) => void;
  /** Language mode — 'qasm' for OpenQASM 2.0, 'python' for Qiskit/CIRQ */
  language?: EditorLanguage;
  /** Colab-style: the editor grows to fit its content instead of scrolling
   * inside a fixed-height box. Opt-in — gates-playground's existing usage
   * (fixed-height parent, height="100%") is untouched by default.
   */
  autoHeight?: boolean;
  minHeight?: number;
}

const QASM_LANGUAGE_ID = 'qasm2';

function registerQasmLanguage(monaco: Monaco) {
  // Register only once
  const existing = monaco.languages.getLanguages().find(l => l.id === QASM_LANGUAGE_ID);
  if (existing) return;

  monaco.languages.register({ id: QASM_LANGUAGE_ID, extensions: ['.qasm'], aliases: ['OpenQASM 2.0', 'qasm'] });

  monaco.languages.setMonarchTokensProvider(QASM_LANGUAGE_ID, {
    keywords: [
      'OPENQASM', 'include', 'qreg', 'creg', 'gate', 'opaque', 'if',
      'barrier', 'measure', 'reset', 'pi',
    ],
    gates: [
      'h', 'x', 'y', 'z', 's', 'sdg', 't', 'tdg', 'cx', 'cy', 'cz',
      'ccx', 'swap', 'id', 'u1', 'u2', 'u3', 'rx', 'ry', 'rz', 'p', 'cp',
    ],
    tokenizer: {
      root: [
        // Line comments
        [/\/\/.*$/, 'comment'],
        // Strings (include paths)
        [/"[^"]*"/, 'string'],
        // Version number
        [/\d+\.\d+/, 'number.float'],
        // Integer
        [/\d+/, 'number'],
        // Keywords
        [/[a-zA-Z_][\w]*/, {
          cases: {
            '@keywords': 'keyword',
            '@gates': 'type',
            '@default': 'identifier',
          }
        }],
        // Operators and punctuation
        [/->/, 'operator'],
        [/[{}\[\]();,]/, 'delimiter'],
        [/[=<>!+\-*/^]/, 'operator'],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration(QASM_LANGUAGE_ID, {
    comments: { lineComment: '//' },
    brackets: [['(', ')'], ['[', ']'], ['{', '}']],
  });
}

export const MonacoEditorPanel: React.FC<MonacoEditorPanelProps> = ({
  code,
  onChange,
  language = 'qasm',
  autoHeight = false,
  minHeight = 56,
}) => {
  const { theme } = useTheme();
  const [contentHeight, setContentHeight] = useState(minHeight);
  const editorRef = useRef<MonacoEditorTypes.editor.IStandaloneCodeEditor | null>(null);

  const syncHeight = () => {
    const editor = editorRef.current;
    if (!editor) return;
    setContentHeight(Math.max(minHeight, editor.getContentHeight()));
  };

  const handleMount = (editor: MonacoEditorTypes.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    if (autoHeight) {
      syncHeight();
      editor.onDidContentSizeChange(syncHeight);
    }
  };

  const handleBeforeMount = (monaco: Monaco) => {
    // Register custom themes
    monaco.editor.defineTheme('glass-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c4b5fd' }, // violet-300
        { token: 'type', foreground: '34d399' },    // emerald-400 (for gates)
        { token: 'number', foreground: '67e8f9' },  // cyan-300
        { token: 'number.float', foreground: '67e8f9' },
        { token: 'string', foreground: 'fcd34d' },  // amber-300
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' }, // gray-500
        { token: 'identifier', foreground: 'e5e7eb' }, // gray-200
        { token: 'operator', foreground: '9ca3af' }, // gray-400
      ],
      colors: {
        'editor.background': '#0c0c0e',
        'editorGutter.background': '#0c0c0e',
        'editor.lineHighlightBackground': '#ffffff08',
        'editorLineNumber.foreground': '#666666',
        'editorLineNumber.activeForeground': '#cccccc',
        'editorCursor.foreground': '#c4b5fd',
        'editor.selectionBackground': '#8b5cf640',
      }
    });
    monaco.editor.defineTheme('glass-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '7c3aed' }, // violet-600
        { token: 'type', foreground: '059669' },    // emerald-600 (for gates)
        { token: 'number', foreground: '0891b2' },  // cyan-600
        { token: 'number.float', foreground: '0891b2' },
        { token: 'string', foreground: 'd97706' },  // amber-600
        { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' }, // gray-400
        { token: 'identifier', foreground: '1f2937' }, // gray-800
        { token: 'operator', foreground: '6b7280' }, // gray-500
      ],
      colors: {
        'editor.background': '#f4f5f8',
        'editorGutter.background': '#f4f5f8',
        'editor.lineHighlightBackground': '#00000008',
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': '#4b5563',
        'editorCursor.foreground': '#7c3aed',
        'editor.selectionBackground': '#8b5cf640',
      }
    });

    // Register QASM language support
    registerQasmLanguage(monaco);
  };

  // Map our prop values to Monaco language IDs
  const monacoLanguage = language === 'qasm' ? QASM_LANGUAGE_ID : 'python';

  return (
    <div className={autoHeight ? "w-full relative bg-transparent" : "w-full h-full relative bg-transparent"}>
      <Editor
        key={monacoLanguage}
        height={autoHeight ? contentHeight : "100%"}
        language={monacoLanguage}
        theme={theme === 'dark' ? 'glass-dark' : 'glass-light'}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        value={code}
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
          // Auto-grow means the editor itself never needs to scroll vertically —
          // the whole cell grows instead, same as Google Colab's code cells.
          ...(autoHeight ? { scrollbar: { vertical: 'hidden', handleMouseWheel: false }, overviewRulerLanes: 0 } : {}),
        }}
      />
    </div>
  );
};
