import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listXPosts, createXPost, updateXPost, updateXPostStatus, deleteXPost } from "@/lib/db";
import type { XPostStatus } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/admin/x-posts", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const posts = await listXPosts();
  return NextResponse.json({ posts });
});

export const POST = withMetrics("/api/admin/x-posts", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: { content: string; imageUrl?: string; hashtags?: string; scheduledAt: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.content?.trim() || !body.scheduledAt) {
    return NextResponse.json({ error: "content and scheduledAt are required" }, { status: 400 });
  }

  const post = await createXPost({
    content: body.content.trim(),
    imageUrl: body.imageUrl?.trim(),
    hashtags: body.hashtags?.trim(),
    scheduledAt: body.scheduledAt,
  });

  return NextResponse.json({ post }, { status: 201 });
});

export const PUT = withMetrics("/api/admin/x-posts", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: { id: string; content?: string; imageUrl?: string; hashtags?: string; scheduledAt?: string; status?: XPostStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (body.status) {
    await updateXPostStatus(body.id, body.status);
  }

  const { id, status: _s, ...updates } = body;
  if (Object.values(updates).some((v) => v !== undefined)) {
    await updateXPost(id, updates);
  }

  return NextResponse.json({ ok: true });
});

export const DELETE = withMetrics("/api/admin/x-posts", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await deleteXPost(id);
  return NextResponse.json({ ok: true });
});
