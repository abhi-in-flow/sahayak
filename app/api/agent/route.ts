import { NextResponse } from "next/server";
import { runAgent, type AgentTurn } from "@/app/_lib/agent/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: {
    message?: string;
    locale?: string;
    state?: string;
    history?: AgentTurn[];
    citations?: { title?: string; url?: string }[];
    debug?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";
  if (!message) return NextResponse.json({ error: "missing message" }, { status: 400 });

  const state =
    body.state === "assam" ||
    body.state === "maharashtra" ||
    body.state === "karnataka" ||
    body.state === "other"
      ? body.state
      : null;

  const history = Array.isArray(body.history)
    ? body.history
        .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
        .slice(-8)
        .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 800) }))
    : [];

  const priorCitations = Array.isArray(body.citations)
    ? body.citations
        .filter((cite) => cite && typeof cite.title === "string" && cite.title.trim())
        .slice(0, 8)
        .map((cite) => ({
          title: cite.title!.trim().slice(0, 200),
          url: typeof cite.url === "string" ? cite.url.slice(0, 500) : undefined,
        }))
    : [];

  const result = await runAgent(
    message.slice(0, 800),
    body.locale,
    state,
    history,
    priorCitations,
    body.debug === true,
  );
  return NextResponse.json(result);
}
