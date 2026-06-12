import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Normalize email to avoid case-sensitivity index misses
    const normalizedEmail = email.trim().toLowerCase();

    // Fetch only the columns needed for auth — avoids deserializing large rows
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        departmentId: true,
        deletedAt: true,
        isActive: true,
        userRoles: {
          select: {
            role: {
              select: { slug: true },
            },
          },
        },
      },
    });

    // Always run bcrypt.compare even on missing user to prevent timing attacks,
    // but use a cheap dummy hash so it exits quickly.
    const DUMMY_HASH =
      "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
    const hashToCompare = user?.password ?? DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch || user.deletedAt || user.isActive === false) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Map DB user to session format
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.userRoles.map((ur) => ur.role.slug),
      departmentId: user.departmentId,
    };

    // Generate JWT
    const token = await generateToken(sessionUser);

    const response = NextResponse.json({
      user: sessionUser,
      message: "Login successful",
    });

    // Set auth cookie
    response.cookies.set("nuanu_token", token, {
      httpOnly: true,
      secure: (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://"),
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
