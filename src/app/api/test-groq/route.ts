/**
 * GET /api/test-groq
 * Temporary debug endpoint — DELETE after confirming Groq works.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const aiKey = process.env.AI_API_KEY || "";

  if (!aiKey) {
    return NextResponse.json(
      { error: "AI_API_KEY is not set in environment variables" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: 'Reply with exactly this JSON and nothing else: {"status":"ok"}',
            },
          ],
          max_tokens: 20,
          temperature: 0,
          stream: false,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    const data = await response.json();

    return NextResponse.json({
      keyExists: true,
      keyPrefix: aiKey.slice(0, 8) + "...",
      httpStatus: response.status,
      model: data.model,
      response: data.choices?.[0]?.message?.content,
      groqWorking: response.ok,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        keyExists: true,
        keyPrefix: aiKey.slice(0, 8) + "...",
        error: msg,
        groqWorking: false,
      },
      { status: 500 },
    );
  }
}
