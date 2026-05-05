import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nuanu-hr-secret-key-2026"
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("nuanu_token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Allow public routes
  if (
    pathname === "/login" || 
    pathname.startsWith("/careers") || 
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/careers") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // 2. Check token for protected routes
  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Verify JWT
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("nuanu_token");
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
