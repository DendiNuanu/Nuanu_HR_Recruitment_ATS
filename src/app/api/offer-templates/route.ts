/**
 * GET  /api/offer-templates  — list all templates
 * POST /api/offer-templates  — create a template
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.offerTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, content, isDefault } = await request.json();
  if (!name || !content) return NextResponse.json({ error: "name and content required" }, { status: 400 });

  // If setting as default, unset all others first
  if (isDefault) {
    await prisma.offerTemplate.updateMany({ data: { isDefault: false } });
  }

  const template = await prisma.offerTemplate.create({
    data: {
      name,
      content,
      isDefault: isDefault ?? false,
      variables: extractVariables(content),
    },
  });

  return NextResponse.json(template, { status: 201 });
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim()))];
}
