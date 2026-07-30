import React from 'react';

interface ExecutionConsoleProps {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({ stdout, stderr, exitCode }) => {
  return (
    <div className="w-full h-full text-qp-text overflow-y-auto font-mono text-sm custom-scrollbar">
      {exitCode !== null && (
        <div className={`mb-2 text-xs font-bold ${exitCode === 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          Process exited with code {exitCode}
        </div>
      )}
      
      {stdout && (
        <div className="mb-4 whitespace-pre-wrap">{stdout}</div>
      )}
      
      {stderr && (
        <div className="whitespace-pre-wrap text-rose-400">{stderr}</div>
      )}
      
      {!stdout && !stderr && exitCode === null && (
        <div className="text-qp-text-muted italic">No output yet. Run your code to see results here.</div>
      )}
    </div>
  );
};
