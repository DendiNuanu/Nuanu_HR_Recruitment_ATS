import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  try {
    const url = await getGoogleAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Google Connect Error:", error);
    return NextResponse.json({ error: "Failed to connect to Google" }, { status: 500 });
  }
}
