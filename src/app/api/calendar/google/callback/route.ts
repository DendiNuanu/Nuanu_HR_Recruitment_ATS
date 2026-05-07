import { NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code from Google" },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  try {
    // ── Resolve userId ────────────────────────────────────────────────────────
    // Strategy 1: Decode the JWT from the HttpOnly cookie (primary).
    // Strategy 2: Decode the userId from the OAuth `state` parameter (fallback).
    // The old code incorrectly checked for an "auth_token_" prefix that was
    // never used — the real cookie is a signed JWT.

    let userId: string | null = null;

    // Strategy 1 — JWT cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("nuanu_token")?.value;
    if (token) {
      const session = await verifyToken(token);
      if (session?.id) userId = session.id;
    }

    // Strategy 2 — OAuth state parameter (base64url-encoded JSON)
    if (!userId && stateParam) {
      try {
        const decoded = JSON.parse(
          Buffer.from(stateParam, "base64url").toString("utf-8"),
        );
        if (decoded?.userId) userId = decoded.userId as string;
      } catch {
        // Malformed state — ignore and fall through to the 401 below
      }
    }

    if (!userId) {
      return NextResponse.redirect(
        `${appUrl}/login?error=calendar_auth_required`,
      );
    }

    // ── Exchange code for tokens ──────────────────────────────────────────────
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token) {
      throw new Error("Google did not return an access token");
    }

    // ── Persist tokens ────────────────────────────────────────────────────────
    await prisma.calendarIntegration.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiryDate: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
        provider: "google",
      },
      create: {
        userId,
        provider: "google",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiryDate: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
      },
    });

    // ── Redirect back to settings with success flag ───────────────────────────
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?calendar=connected`,
    );
  } catch (error) {
    console.error("Google Calendar Callback Error:", error);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?calendar=error`);
  }
}
