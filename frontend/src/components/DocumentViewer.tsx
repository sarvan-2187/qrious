import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface DocumentViewerProps {
  fileUrl: string;
}

export function DocumentViewer({ fileUrl }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  return (
    <div className="flex flex-col items-center bg-muted/20 p-4 rounded-lg overflow-hidden w-full h-full">
      <div className="flex-1 overflow-auto w-full flex justify-center pb-4 min-h-[400px]">
        <Document 
          file={fileUrl} 
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            setPageNumber(1);
          }}
          loading={
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              Loading PDF...
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center py-20 text-destructive text-center">
              Failed to load PDF. The link may have expired.
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer 
            renderAnnotationLayer 
            className="shadow-xl" 
            width={Math.min(window.innerWidth - 80, 800)}
          />
        </Document>
      </div>
      
      <div className="flex items-center gap-4 mt-auto pt-4 bg-background px-6 py-3 rounded-full shadow-sm border border-border">
        <button 
          disabled={pageNumber <= 1} 
          onClick={() => setPageNumber((p) => p - 1)}
          className="px-4 py-1 text-sm font-medium rounded-md hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
        >
          Prev
        </button>
        <span className="text-sm font-medium min-w-[80px] text-center">
          {pageNumber} / {numPages || '-'}
        </span>
        <button 
          disabled={pageNumber >= numPages} 
          onClick={() => setPageNumber((p) => p + 1)}
          className="px-4 py-1 text-sm font-medium rounded-md hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
