import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { FaCode } from 'react-icons/fa';
import { cn } from '@/lib/utils';

interface QuantumMarkdownRendererProps {
  content: string;
  onApplyCode?: (code: string) => void;
  className?: string;
}

export const QuantumMarkdownRenderer: React.FC<QuantumMarkdownRendererProps> = ({ content, onApplyCode, className }) => {
  // Pre-process LLM output to fix common formatting issues
  const preprocessMath = (text: string) => {
    let processed = text
      // Convert standard brackets used as display math [ \psi ] or [|\psi\rangle] into $$ \psi $$
      .replace(/\[\s*(\\.*?|\|.*?)\s*\]/g, '$$$$ $1 $$$$')
      // Convert escaped brackets \[ \] to $$ $$
      .replace(/\\\[(.*?)\\\]/gs, '$$$$$1$$$$')
      // Convert escaped parentheses \( \) to $ $
      .replace(/\\\((.*?)\\\)/gs, '$$$1$$');

    // Replace | with \vert inside inline math $...$ or display math $$...$$
    // This is crucial to prevent markdown tables from breaking when Dirac notation contains |
    processed = processed.replace(/(\$\$?)([^$]+)\1/g, (_match, delimiter, mathContent) => {
      return delimiter + mathContent.replace(/\|/g, '\\vert ') + delimiter;
    });

    return processed;
  };

  const processedContent = preprocessMath(content);

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          table: ({ node, ...props }) => (
            <div className="w-full overflow-x-auto my-4 rounded-md border border-qp-border">
              <table className="w-full text-left text-sm border-collapse" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-2 bg-black/10 dark:bg-white/5 font-semibold text-qp-text border-b border-qp-border whitespace-nowrap" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 border-b border-qp-border/50 text-qp-text-muted last:border-0 whitespace-nowrap" {...props} />
          ),
          p: ({ node, children, ...props }) => (
            // Apply strict overflow rules to paragraphs to avoid horizontal stretching from long text
            <p className="mb-3 last:mb-0 break-words overflow-hidden" {...props}>
              {children}
            </p>
          ),
          a: ({ node, ...props }) => (
            <a className="text-emerald-500 hover:text-emerald-400 break-all" {...props} />
          ),
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-qp-text" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-4 mb-2 text-qp-text" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-3 mb-1 text-qp-text" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1 text-qp-text" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-qp-text" {...props} />,
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          pre: ({ node, children, ...props }: any) => {
            // Find the code element inside the pre
            const childrenArray = React.Children.toArray(children);
            const codeElement = childrenArray.find((child: any) => child?.props && child.type === 'code') as React.ReactElement | undefined;
            
            if (!codeElement) {
              return <pre {...props}>{children}</pre>;
            }

            const className = (codeElement.props as any).className;
            const match = /language-(\w+)/.exec(className || '');
            const isQasm = match && match[1] === 'qasm';
            const codeStr = String((codeElement.props as any).children).replace(/\n$/, '');

            return (
              <div className="relative group mt-3 mb-3">
                {isQasm && onApplyCode && (
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={() => onApplyCode(codeStr)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded flex items-center gap-1 shadow-sm"
                      title="Apply this QASM to Editor"
                    >
                      <FaCode /> Apply
                    </button>
                  </div>
                )}
                <div className="bg-black/40 rounded-lg border border-qp-border overflow-hidden w-full">
                  {match && match[1] && (
                    <div className="px-3 py-1 bg-black/50 text-[10px] text-qp-text-muted font-mono uppercase tracking-wider border-b border-qp-border/50">
                      {match[1]}
                    </div>
                  )}
                  <pre className="p-3 overflow-x-auto text-[11px] font-mono m-0 [scrollbar-width:'thin']" {...props}>
                    {children}
                  </pre>
                </div>
              </div>
            );
          },
          code({ node, className, children, ...props }: any) {
            // For inline code, or block code inside the custom pre
            return (
              <code className={cn(!className && "bg-black/20 text-emerald-400 dark:text-emerald-300 rounded px-1.5 py-0.5", "font-mono text-[11px] break-words", className)} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
