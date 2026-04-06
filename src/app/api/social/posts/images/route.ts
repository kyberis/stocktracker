import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/social/posts/images", async (request: NextRequest) => {
  const { session, error } = await requireSession(request);
  if (error || !session) return error!;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(`social/${session.userId}/${Date.now()}-${file.name}`, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: "Image upload not configured" }, { status: 500 });
  }
});
