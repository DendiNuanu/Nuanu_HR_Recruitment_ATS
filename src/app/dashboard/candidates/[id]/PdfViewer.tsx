"use client";

import { useMemo } from "react";

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

  return (
    <div className="flex-1 min-h-0 bg-gray-100 overflow-y-auto p-4">
      <div className="mb-4 flex flex-wrap gap-3">
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-nuanu-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-nuanu-primary/90"
        >
          Open in new tab
        </a>
        <a
          href={resolvedUrl}
          download
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-nuanu-gray-700 transition-colors hover:bg-gray-50"
        >
          Download
        </a>
      </div>
      <div className="w-full" style={{ height: "80vh" }}>
        <iframe
          src={resolvedUrl}
          className="h-full w-full rounded-lg border border-gray-200 bg-white"
          style={{ minHeight: "600px" }}
          title="Resume / CV"
        />
      </div>
    </div>
  );
}