import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/proxy-resume?url=<encoded URL>
 *
 * Server-side proxy for resume PDF files. Fetches the PDF from the
 * production domain (or local filesystem) and streams it back to the
 * browser. This avoids CORS errors when react-pdf running on
 * localhost:3000 tries to fetch https://hr-ats.nuanu.site/... cross-origin.
 *
 * Security: Only allows fetching from known app domains. Not an open proxy.
 */

const ALLOWED_HOSTS = [
  // The configured app URL (production: hr-ats.nuanu.site, local: localhost:3000)
  process.env.NEXT_PUBLIC_APP_URL,
  // Hard-coded production domain (always safe to allow)
  "https://hr-ats.nuanu.site",
  // Local dev fallback
  "http://localhost:3000",
].filter(Boolean) as string[];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow /uploads/resumes/ paths — not arbitrary URLs
    if (!parsed.pathname.startsWith("/uploads/resumes/")) {
      return false;
    }
    // Check against known hosts
    return ALLOWED_HOSTS.some((host) => {
      try {
        return parsed.origin === new URL(host).origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400 },
    );
  }

  if (!isAllowedUrl(targetUrl)) {
    return NextResponse.json(
      { error: "URL is not from an allowed origin" },
      { status: 403 },
    );
  }

  try {
    const response = await fetch(targetUrl, {
      // In production, the server fetches from itself (same machine).
      // In local dev, the server fetches from the production domain.
      // Neither case has CORS restrictions since this is server-side.
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status },
      );
    }

    const contentLength = response.headers.get("content-length");

    // Stream the PDF bytes directly to the client without iframe-blocking headers.
    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=3600",
    };
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    const proxiedResponse = new NextResponse(response.body, {
      status: 200,
      headers,
    });
    proxiedResponse.headers.set("X-Frame-Options", "");
    proxiedResponse.headers.delete("X-Frame-Options");

    return proxiedResponse;
  } catch (err) {
    console.error("[proxy-resume] Fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch the resume file" },
      { status: 502 },
    );
  }
}