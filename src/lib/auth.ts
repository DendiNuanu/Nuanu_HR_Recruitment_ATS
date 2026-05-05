import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nuanu-hr-secret-key-2026"
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export async function generateToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nuanu_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("nuanu_token");
}
