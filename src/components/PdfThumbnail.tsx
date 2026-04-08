import React, { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Setup worker — use native Vite module to prevent MIME type issues
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfThumbnailProps {
  url: string;
  alt: string;
  className?: string;
  scale?: number;
}

export default function PdfThumbnail({ url, alt, className = "", scale = 0.5 }: PdfThumbnailProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        if (!active) return;

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport, canvas } as any).promise;
          if (active) setImgSrc(canvas.toDataURL());
        }
      } catch (err) {
        console.error("PDF preview error:", err);
        if (active) setError(true);
      }
    };
    loadPdf();
    return () => { active = false; };
  }, [url, scale]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-red-500/10 text-red-400 ${className}`}>
        <span className="text-[10px] uppercase font-bold">Erro PDF</span>
      </div>
    );
  }

  if (!imgSrc) {
    return (
      <div className={`flex items-center justify-center bg-white/5 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500/40" />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
    />
  );
}
