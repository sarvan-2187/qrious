import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const { theme } = useTheme();

  useEffect(() => {
    // Re-initialize mermaid with current theme
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose', // Needed if we want clickable nodes, though we just render SVGs
      fontFamily: 'Inter, sans-serif',
      flowchart: {
        htmlLabels: true,
        curve: 'basis'
      }
    });

    const renderDiagram = async () => {
      try {
        if (!containerRef.current) return;
        // Generate unique ID for this render to avoid mermaid conflicts
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvgContent(svg);
      } catch (err) {
        console.error('Failed to render mermaid diagram', err);
        setSvgContent(`<div class="text-red-500 p-4 border border-red-500 rounded bg-red-50">Failed to render diagram</div>`);
      }
    };

    renderDiagram();
  }, [chart, theme]);

  return (
    <div 
      className={cn("flex justify-center my-8 overflow-x-auto", className)}
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};
