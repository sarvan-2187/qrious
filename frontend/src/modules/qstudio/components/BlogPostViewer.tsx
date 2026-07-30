import React from 'react';
import jsPDF from 'jspdf';
import { FaDownload } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { BlogPostResult } from '../types';

interface BlogPostViewerProps {
  result: BlogPostResult;
  // Unlike the other viewers, `title` here is only a PDF-filename fallback —
  // the article's own `result.title` is what's actually displayed, since a
  // blog post has its own headline distinct from the study space's title.
  title?: string;
}

function downloadBlogPostPdf(result: BlogPostResult, fallbackTitle: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const addWrapped = (text: string, fontSize: number, lineHeight: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    const lines: string[] = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
  };

  addWrapped(result.title, 20, 26, true);
  y += 10;

  addWrapped(result.intro, 11, 15);
  y += 10;

  result.sections.forEach((section) => {
    addWrapped(section.heading, 14, 18, true);
    addWrapped(section.body, 11, 15);
    y += 10;
  });

  addWrapped(result.conclusion, 11, 15);

  const filenameBase = (result.title || fallbackTitle).toLowerCase().replace(/\s+/g, '-') || 'blog-post';
  doc.save(`${filenameBase}.pdf`);
}

export const BlogPostViewer: React.FC<BlogPostViewerProps> = ({ result, title = 'Blog Post' }) => {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold tracking-tight">{result.title}</h3>
        <button
          onClick={() => downloadBlogPostPdf(result, title)}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border",
            theme === 'dark' ? "border-white/10 text-zinc-300 hover:text-white" : "border-zinc-200 text-zinc-700 hover:text-zinc-900",
          )}
        >
          <FaDownload className="w-3 h-3" /> Download PDF
        </button>
      </div>

      <p className={cn("text-sm leading-relaxed font-medium", theme === 'dark' ? "text-zinc-200" : "text-zinc-800")}>
        {result.intro}
      </p>

      {result.sections.map((section, idx) => (
        <div key={idx}>
          <h4 className={cn("text-sm font-semibold mb-1.5", theme === 'dark' ? "text-emerald-400" : "text-emerald-600")}>
            {section.heading}
          </h4>
          <p className={cn("text-sm leading-relaxed whitespace-pre-wrap", theme === 'dark' ? "text-zinc-300" : "text-zinc-700")}>
            {section.body}
          </p>
        </div>
      ))}

      <p className={cn(
        "text-sm leading-relaxed italic border-t pt-4",
        theme === 'dark' ? "text-zinc-400 border-white/10" : "text-zinc-600 border-zinc-200",
      )}>
        {result.conclusion}
      </p>
    </div>
  );
};
