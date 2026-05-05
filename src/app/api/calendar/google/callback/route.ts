import { NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nuanu_token")?.value;
    
    if (!token || !token.startsWith("auth_token_")) {
      return NextResponse.json({ error: "Unauthorized. Please login first." }, { status: 401 });
    }

    const userId = token.replace("auth_token_", "");

    const tokens = await getTokensFromCode(code);

    await prisma.calendarIntegration.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiryDate: new Date(tokens.expiry_date!),
      },
      create: {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiryDate: new Date(tokens.expiry_date!),
      },
    });

    // Redirect back to settings or dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?calendar=connected`);
  } catch (error) {
    console.error("Google Callback Error:", error);
    return NextResponse.json({ error: "Failed to process Google Calendar connection" }, { status: 500 });
  }
}
