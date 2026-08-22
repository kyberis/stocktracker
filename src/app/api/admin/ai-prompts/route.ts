import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import {
  getAiPromptById,
  listAiPromptCatalog,
  PROMPT_GROUPS,
} from "@/lib/ai/prompt-registry";

export const GET = withMetrics("/api/admin/ai-prompts", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const entry = getAiPromptById(id);
    if (!entry) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    return NextResponse.json({ entry });
  }

  const prompts = listAiPromptCatalog();
  return NextResponse.json({
    groups: PROMPT_GROUPS,
    prompts: prompts.map(({ systemPrompt, userPrompt, ...meta }) => ({
      ...meta,
      systemChars: systemPrompt.length,
      userChars: userPrompt?.length ?? 0,
    })),
  });
});

export const POST = withMetrics("/api/admin/ai-prompts", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const entry = getAiPromptById(body.id);
  if (!entry) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  return NextResponse.json({ entry });
});
