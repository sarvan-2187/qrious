import { useRef, useEffect, useState } from 'react';
import { CERTIFICATE_CONFIG } from '../config/certificateConfig';
import { drawWaveDecoration } from '../utils/drawCertificateDecoration';
import jsPDF from 'jspdf';

interface CertificateGeneratorProps {
  studentName: string;
  courseName: string;
  completionDate: string;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseFontSize: number, fontFamily: string): number {
  let fontSize = baseFontSize;
  ctx.font = `${fontSize}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 14) {
    fontSize -= 2;
    ctx.font = `${fontSize}px ${fontFamily}`;
  }
  return fontSize;
}

export function CertificateGenerator({ studentName, courseName, completionDate }: CertificateGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { canvasWidth: width, canvasHeight: height } = CERTIFICATE_CONFIG;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = CERTIFICATE_CONFIG.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Decorative waves + watermark
    drawWaveDecoration(ctx, width, height);

    ctx.fillStyle = CERTIFICATE_CONFIG.textColor;
    ctx.textAlign = 'left';

    // Title
    ctx.font = "bold 48px Georgia, 'Times New Roman', serif";
    ctx.fillText("Certificate of Course Completion", width * 0.16, height * 0.2);

    // "This is to Certify that"
    ctx.font = CERTIFICATE_CONFIG.bodyFont;
    ctx.textAlign = 'center';
    ctx.fillText("This is to Certify that", width * 0.5, height * 0.38);

    // Underline for student name
    const nameLineY = height * 0.53;
    const nameLineStartX = width * 0.28;
    const nameLineEndX = width * 0.72;
    ctx.strokeStyle = CERTIFICATE_CONFIG.lineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(nameLineStartX, nameLineY);
    ctx.lineTo(nameLineEndX, nameLineY);
    ctx.stroke();

    // Student name (sits just above the line)
    const nameFontSize = fitText(ctx, studentName, nameLineEndX - nameLineStartX, 34, "Georgia, serif");
    ctx.font = `bold ${nameFontSize}px Georgia, serif`;
    ctx.fillText(studentName, width * 0.5, nameLineY - 12);

    // "Has successfully finished the course ___ on"
    ctx.font = CERTIFICATE_CONFIG.bodyFont;
    ctx.textAlign = 'left';
    const courseLineY = height * 0.66;
    ctx.fillText("Has successfully finished the course", width * 0.16, courseLineY);

    const courseLabelWidth = ctx.measureText("Has successfully finished the course ").width;
    const courseBlankStartX = width * 0.16 + courseLabelWidth;
    const courseBlankEndX = width * 0.78;
    ctx.beginPath();
    ctx.moveTo(courseBlankStartX, courseLineY + 6);
    ctx.lineTo(courseBlankEndX, courseLineY + 6);
    ctx.stroke();
    
    const courseNameFontSize = fitText(ctx, courseName, courseBlankEndX - courseBlankStartX, 24, "Arial, sans-serif");
    ctx.font = `${courseNameFontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(courseName, (courseBlankStartX + courseBlankEndX) / 2, courseLineY - 6);
    
    ctx.font = CERTIFICATE_CONFIG.bodyFont;
    ctx.textAlign = 'left';
    ctx.fillText("on", courseBlankEndX + 15, courseLineY);

    // Date underline (below course line)
    const dateLineY = height * 0.75;
    ctx.beginPath();
    ctx.moveTo(width * 0.4, dateLineY);
    ctx.lineTo(width * 0.6, dateLineY);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(completionDate, width * 0.5, dateLineY - 8);

    // Footer note
    ctx.font = CERTIFICATE_CONFIG.footerFont;
    ctx.fillStyle = "rgba(245, 245, 245, 0.7)";
    ctx.textAlign = 'right';
    ctx.fillText("This certificate is digitally generated and requires no signature", width * 0.92, height * 0.9);

    setReady(true);
  }, [studentName, courseName, completionDate]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `certificate-${courseName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function handleDownloadPdf() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`certificate-${courseName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  return (
    <div className="flex flex-col items-center gap-4 my-8">
      <canvas ref={canvasRef} className="max-w-full h-auto border border-white/10 rounded-lg shadow-xl" />
      <div className="flex gap-4">
        <button onClick={handleDownload} disabled={!ready} className="px-4 py-2 bg-primary text-primary-foreground rounded shadow font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
          Download PNG
        </button>
        <button onClick={handleDownloadPdf} disabled={!ready} className="px-4 py-2 bg-secondary text-secondary-foreground rounded shadow font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50">
          Download PDF
        </button>
      </div>
    </div>
  );
}
