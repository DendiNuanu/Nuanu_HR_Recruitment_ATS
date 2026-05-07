import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google-calendar";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    // Verify the user is logged in before initiating the OAuth flow
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || ""}/login`,
      );
    }

    // Build the Google OAuth URL with the userId embedded in the state param
    const url = await getGoogleAuthUrl(session.id);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Google Connect Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google Calendar connection" },
      { status: 500 },
    );
  }
}
