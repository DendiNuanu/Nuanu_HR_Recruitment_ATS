"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2, FileText } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  pdfUrl: string;
}

/**
 * If the resume URL points to a different origin (e.g. production domain
 * while developing on localhost), rewrite it through the server-side proxy
 * to avoid CORS errors. In production the URL is same-origin so no rewrite
 * occurs — the proxy is only used when genuinely cross-origin.
 */
function resolvePdfUrl(rawUrl: string): string {
  if (typeof window === "undefined") return rawUrl;
  try {
    const target = new URL(rawUrl, window.location.origin);
    if (target.origin !== window.location.origin) {
      return `/api/proxy-resume?url=${encodeURIComponent(rawUrl)}`;
    }
  } catch {
    // Not a valid absolute URL — pass through as-is
  }
  return rawUrl;
}

export default function PdfViewer({ pdfUrl }: PdfViewerProps) {
  const resolvedUrl = useMemo(() => resolvePdfUrl(pdfUrl), [pdfUrl]);
  const documentFile = useMemo(
    () => ({ url: resolvedUrl, withCredentials: true }),
    [resolvedUrl],
  );
  const [numPages, setNumPages] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(el);
    if (el.clientHeight > 0) {
      setContainerHeight(el.clientHeight);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 bg-gray-100 overflow-y-auto">
      <div className="flex flex-col items-center py-4">
        <Document
          file={documentFile}
          onLoadSuccess={({ numPages: loaded }) => {
            console.log("[PdfViewer] PDF loaded", { url: resolvedUrl, numPages: loaded });
            setNumPages(loaded);
          }}
          onLoadError={(error) => {
            console.error("[PdfViewer] PDF load failed", { url: resolvedUrl, error });
          }}
          loading={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-nuanu-gray-400" />
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FileText className="w-12 h-12 text-nuanu-gray-300" />
              <p className="text-sm text-nuanu-gray-500">
                Failed to load PDF. Try opening in a new tab.
              </p>
            </div>
          }
        >
          {Array.from(new Array(numPages), (_, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              height={containerHeight}
              className="mb-4 shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          ))}
        </Document>
      </div>
    </div>
  );
}