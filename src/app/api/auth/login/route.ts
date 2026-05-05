import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Connect to actual Prisma Database
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
        userRoles: {
          include: { role: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Map DB user to session format
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.userRoles.map(ur => ur.role.slug), // Use slugs for consistency
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
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
