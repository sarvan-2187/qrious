import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';

interface TheoryPanelProps {
  markdown: string;
  className?: string;
}

const CustomBlockquote: React.FC<any> = ({ children, ...props }) => {
  // Extract text to check for prefixes
  let text = '';
  React.Children.forEach(children, (child) => {
    if (typeof child === 'string') text += child;
    else if (child?.props?.children) {
      if (typeof child.props.children === 'string') text += child.props.children;
      else if (Array.isArray(child.props.children)) {
        text += child.props.children.map((c: any) => typeof c === 'string' ? c : '').join('');
      }
    }
  });

  const lowerText = text.toLowerCase();
  
  if (lowerText.startsWith('note:') || lowerText.startsWith('important:')) {
    return (
      <div className="my-6 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-r-lg flex gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-blue-900 dark:text-blue-200 text-sm md:text-base leading-relaxed">{children}</div>
      </div>
    );
  }
  
  if (lowerText.startsWith('warning:') || lowerText.startsWith('caution:')) {
    return (
      <div className="my-6 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-r-lg flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-amber-900 dark:text-amber-200 text-sm md:text-base leading-relaxed">{children}</div>
      </div>
    );
  }

  if (lowerText.startsWith('tip:') || lowerText.startsWith('pro-tip:')) {
    return (
      <div className="my-6 border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-r-lg flex gap-3">
        <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-emerald-900 dark:text-emerald-200 text-sm md:text-base leading-relaxed">{children}</div>
      </div>
    );
  }

  if (lowerText.startsWith('example:')) {
    return (
      <div className="my-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900/50 p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">Example</span>
        </div>
        <div className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed">{children}</div>
      </div>
    );
  }

  // Default blockquote
  return (
    <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-4 py-1 my-6 italic text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-zinc-900/50 rounded-r-lg" {...props}>
      {children}
    </blockquote>
  );
};

export const TheoryPanel: React.FC<TheoryPanelProps> = ({ markdown, className }) => {
  return (
    <div className={cn(
      "prose prose-slate dark:prose-invert max-w-none w-full",
      "prose-lg leading-relaxed md:leading-loose text-slate-800 dark:text-slate-300",
      "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-slate-100",
      "prose-h1:text-4xl prose-h1:mb-8",
      "prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-slate-800 prose-h2:pb-2",
      "prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4",
      "prose-p:mb-6 prose-p:leading-relaxed",
      "prose-a:text-emerald-600 dark:prose-a:text-emerald-400 hover:prose-a:text-emerald-500 prose-a:font-medium prose-a:underline-offset-4",
      "prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-semibold",
      "prose-code:text-emerald-600 dark:prose-code:text-emerald-400 prose-code:bg-emerald-50 dark:prose-code:bg-emerald-950/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:font-mono prose-code:text-[0.9em]",
      "prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:rounded-xl prose-pre:p-4 prose-pre:shadow-lg overflow-x-auto",
      "prose-table:w-full prose-table:border-collapse prose-table:my-8",
      "prose-th:border prose-th:border-slate-200 dark:prose-th:border-slate-800 prose-th:bg-slate-50 dark:prose-th:bg-zinc-900 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold",
      "prose-td:border prose-td:border-slate-200 dark:prose-td:border-slate-800 prose-td:px-4 prose-td:py-3",
      "prose-li:my-2",
      "font-sans",
      className
    )}>
      <ReactMarkdown 
        remarkPlugins={[remarkMath, remarkGfm]} 
        rehypePlugins={[rehypeKatex]}
        components={{
          blockquote: CustomBlockquote,
          div: ({node, className, ...props}) => {
            if (className?.includes('math-display')) {
              return <div className="overflow-x-auto py-4 my-6 flex justify-center bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800" {...props} />
            }
            return <div className={className} {...props} />
          }
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};
