import { jsPDF } from "jspdf";
import type { Note } from "../types/note.types";

// ---------------------------------------------------------------------------
// Strip inline markdown markers for plain-text PDF output
// e.g. **bold** -> bold, *italic* -> italic, `code` -> code
// ---------------------------------------------------------------------------
function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
type RGB = [number, number, number];
const EMERALD: RGB   = [16, 185, 129];
const ZINC900: RGB   = [17, 24, 39];
const ZINC600: RGB   = [75, 85, 99];
const ZINC400: RGB   = [156, 163, 175];
const ZINC200: RGB   = [228, 228, 231];
const GREEN_BG: RGB  = [240, 253, 244];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export async function downloadNoteAsPdf(note: Note): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();   // 210
  const pageH = pdf.internal.pageSize.getHeight();  // 297
  const marginL = 16;
  const marginR = pageW - 16;
  const contentW = marginR - marginL;

  // ── We track the Y cursor across pages ──────────────────────────────────
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 18) {
      addFooter();
      pdf.addPage();
      drawHeader();
      y = 42; // below header
    }
  };

  // ── Header ───────────────────────────────────────────────────────────────
  const drawHeader = () => {
    // Emerald accent bar
    pdf.setFillColor(...EMERALD);
    pdf.rect(0, 0, pageW, 1.5, "F");

    // Logo
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(...EMERALD);
    pdf.text("Qrious", marginL, 12);

    // Subtitle
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...ZINC400);
    pdf.text("QUANTUM LEARNING PLATFORM", marginL, 17);

    // Date top-right
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
    pdf.setFontSize(8);
    pdf.setTextColor(...ZINC600);
    pdf.text(dateStr, marginR, 12, { align: "right" });

    // Separator line
    pdf.setDrawColor(...ZINC200);
    pdf.setLineWidth(0.4);
    pdf.line(marginL, 21, marginR, 21);
  };

  // ── Footer ───────────────────────────────────────────────────────────────
  const addFooter = () => {
    pdf.setDrawColor(...EMERALD);
    pdf.setLineWidth(0.4);
    pdf.line(marginL, pageH - 10, marginR, pageH - 10);

    pdf.setFontSize(7.5);
    pdf.setTextColor(...ZINC400);
    pdf.text("Qrious — Quantum Learning Platform", marginL, pageH - 5);

    const page = pdf.getNumberOfPages();
    pdf.text(`Page ${page}`, marginR, pageH - 5, { align: "right" });
  };

  // ── Diagonal watermark ────────────────────────────────────────────────────
  const drawWatermark = () => {
    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 0.04 }));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(72);
    pdf.setTextColor(...EMERALD);
    // Rotate around page center
    pdf.text("QRIOUS", pageW / 2, pageH / 2, {
      align: "center",
      angle: 35,
    });
    pdf.restoreGraphicsState();
  };

  // ── Title block ──────────────────────────────────────────────────────────
  const drawTitleBlock = () => {
    y = 27;

    // Note title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...ZINC900);
    const titleLines = pdf.splitTextToSize(note.title || "Untitled Note", contentW);
    pdf.text(titleLines, marginL, y);
    y += titleLines.length * 7 + 2;

    // Tags
    const tags = Array.isArray(note.tags)
      ? note.tags
      : typeof note.tags === "string"
      ? [note.tags]
      : [];

    if (tags.length > 0) {
      let tx = marginL;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      tags.forEach((tag) => {
        const label = `  ${tag}  `;
        const w = pdf.getTextWidth(label) + 2;
        pdf.setFillColor(...GREEN_BG);
        pdf.setDrawColor(...EMERALD);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(tx, y - 3.5, w, 5.5, 1.5, 1.5, "FD");
        pdf.setTextColor(...EMERALD);
        pdf.text(label, tx + 1, y + 0.5);
        tx += w + 3;
      });
      y += 9;
    }

    // Divider under title
    pdf.setDrawColor(...ZINC200);
    pdf.setLineWidth(0.3);
    pdf.line(marginL, y, marginR, y);
    y += 7;
  };

  // ── Markdown block renderer ──────────────────────────────────────────────
  const renderBody = (raw: string) => {
    if (!raw.trim()) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(10);
      pdf.setTextColor(...ZINC400);
      pdf.text("(Empty note)", marginL, y);
      y += 8;
      return;
    }

    const lines = raw.split("\n");
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // ── Fenced code block ────────────────────────────────────────────────
      if (line.trimStart().startsWith("```")) {
        const lang = line.trim().slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;

        const lineH = 5;
        const blockH = codeLines.length * lineH + (lang ? 12 : 6) + 4;
        ensureSpace(blockH + 4);

        // Background rect
        pdf.setFillColor(249, 250, 251);
        pdf.setDrawColor(...ZINC200);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(marginL, y - 1, contentW, blockH, 3, 3, "FD");

        // Lang label
        if (lang) {
          pdf.setFont("courier", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(...EMERALD);
          pdf.text(lang.toUpperCase(), marginL + 3, y + 4);
          y += 8;
          // inner separator
          pdf.setDrawColor(...ZINC200);
          pdf.line(marginL, y, marginL + contentW, y);
          y += 3;
        } else {
          y += 3;
        }

        pdf.setFont("courier", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...EMERALD);
        codeLines.forEach((cl) => {
          const wrapped = pdf.splitTextToSize(cl || " ", contentW - 6);
          pdf.text(wrapped, marginL + 3, y);
          y += wrapped.length * lineH;
        });

        y += 4;
        continue;
      }

      // ── Bullet list ──────────────────────────────────────────────────────
      if (line.startsWith("- ") || line.startsWith("* ")) {
        while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
          const text = stripInline(lines[i].slice(2));
          const wrapped = pdf.splitTextToSize(text, contentW - 8);
          ensureSpace(wrapped.length * 5 + 2);

          pdf.setFillColor(...EMERALD);
          pdf.circle(marginL + 2, y - 1.2, 1, "F");

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(...ZINC900);
          pdf.text(wrapped, marginL + 6, y);
          y += wrapped.length * 5 + 1.5;
          i++;
        }
        y += 2;
        continue;
      }

      // ── Headings ─────────────────────────────────────────────────────────
      if (line.startsWith("### ")) {
        ensureSpace(12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...ZINC900);
        pdf.text(stripInline(line.slice(4)), marginL, y);
        y += 7;
        i++; continue;
      }
      if (line.startsWith("## ")) {
        ensureSpace(16);
        y += 2;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(...ZINC900);
        pdf.text(stripInline(line.slice(3)), marginL, y);
        y += 2;
        pdf.setDrawColor(...ZINC200);
        pdf.line(marginL, y + 1, marginR, y + 1);
        y += 6;
        i++; continue;
      }
      if (line.startsWith("# ")) {
        ensureSpace(18);
        y += 3;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);
        pdf.setTextColor(...ZINC900);
        pdf.text(stripInline(line.slice(2)), marginL, y);
        y += 8;
        i++; continue;
      }

      // ── Horizontal rule ──────────────────────────────────────────────────
      if (/^[-*_]{3,}$/.test(line.trim())) {
        ensureSpace(6);
        pdf.setDrawColor(...ZINC200);
        pdf.setLineWidth(0.3);
        pdf.line(marginL, y, marginR, y);
        y += 5;
        i++; continue;
      }

      // ── Blank line ───────────────────────────────────────────────────────
      if (!line.trim()) {
        y += 3;
        i++; continue;
      }

      // ── Paragraph ────────────────────────────────────────────────────────
      const text = stripInline(line);
      const wrapped = pdf.splitTextToSize(text, contentW);
      ensureSpace(wrapped.length * 5.5 + 2);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...ZINC900);
      pdf.text(wrapped, marginL, y);
      y += wrapped.length * 5.5 + 1.5;
      i++;
    }
  };

  // ── Assemble the document ────────────────────────────────────────────────
  drawHeader();
  drawWatermark();
  drawTitleBlock();
  renderBody(note.content_markdown || "");
  addFooter();

  // ── Add footer + watermark to every page ──────────────────────────────────
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    // Footer text already added at page-break time; update page totals
    pdf.setDrawColor(...EMERALD);
    pdf.setLineWidth(0.4);
    pdf.line(marginL, pageH - 10, marginR, pageH - 10);
    pdf.setFontSize(7.5);
    pdf.setTextColor(...ZINC400);
    pdf.text("Qrious — Quantum Learning Platform", marginL, pageH - 5);
    pdf.text(`Page ${p} of ${totalPages}`, marginR, pageH - 5, { align: "right" });
  }

  const safeTitle = (note.title || "note")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .slice(0, 60);
  pdf.save(`qrious_${safeTitle}.pdf`);
}
