import React from 'react';
import jsPDF from 'jspdf';
import { FaDownload } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { BriefingResult } from '../types';

interface BriefingDocViewerProps {
  result: BriefingResult;
  title?: string;
}

function downloadBriefingPdf(result: BriefingResult, title: string) {
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

  addWrapped(title, 20, 26, true);
  y += 10;

  addWrapped('Overview', 14, 18, true);
  addWrapped(result.overview, 11, 15);
  y += 10;

  if (result.key_topics.length > 0) {
    addWrapped('Key Topics', 14, 18, true);
    result.key_topics.forEach((topic) => {
      addWrapped(topic.title, 12, 16, true);
      addWrapped(topic.summary, 11, 15);
      y += 6;
    });
  }

  if (result.glossary.length > 0) {
    addWrapped('Glossary', 14, 18, true);
    result.glossary.forEach((entry) => {
      addWrapped(`${entry.term} — ${entry.definition}`, 11, 15);
    });
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-') || 'briefing-doc'}.pdf`);
}

export const BriefingDocViewer: React.FC<BriefingDocViewerProps> = ({ result, title = 'Briefing Doc' }) => {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end">
        <button
          onClick={() => downloadBriefingPdf(result, title)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border",
            theme === 'dark' ? "border-white/10 text-zinc-300 hover:text-white" : "border-zinc-200 text-zinc-700 hover:text-zinc-900",
          )}
        >
          <FaDownload className="w-3 h-3" /> Download PDF
        </button>
      </div>

      <div>
        <h4 className={cn("text-xs font-mono uppercase tracking-wider mb-2", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
          Overview
        </h4>
        <p className={cn("text-sm leading-relaxed", theme === 'dark' ? "text-zinc-300" : "text-zinc-700")}>
          {result.overview}
        </p>
      </div>

      {result.key_topics.length > 0 && (
        <div>
          <h4 className={cn("text-xs font-mono uppercase tracking-wider mb-2", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
            Key Topics
          </h4>
          <div className="flex flex-col gap-3">
            {result.key_topics.map((topic, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-xl border",
                  theme === 'dark' ? "bg-black/40 border-white/10" : "bg-zinc-50 border-zinc-200",
                )}
              >
                <p className="text-sm font-semibold mb-1">{topic.title}</p>
                <p className={cn("text-sm leading-relaxed", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                  {topic.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.glossary.length > 0 && (
        <div>
          <h4 className={cn("text-xs font-mono uppercase tracking-wider mb-2", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
            Glossary
          </h4>
          <dl className="flex flex-col gap-2">
            {result.glossary.map((entry, idx) => (
              <div key={idx} className="text-sm">
                <dt className="inline font-semibold">{entry.term}</dt>
                <dd className={cn("inline ml-1.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                  — {entry.definition}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};
