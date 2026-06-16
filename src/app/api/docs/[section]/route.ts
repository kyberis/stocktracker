import { NextResponse } from "next/server";

import { getPublicDocSection, isPublicDocSectionId } from "@/lib/public-api-docs/sections";

export const dynamic = "force-static";

type RouteContext = { params: Promise<{ section: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { section } = await context.params;
  if (!isPublicDocSectionId(section)) {
    return NextResponse.json({ error: "unknown_section", section }, { status: 404 });
  }
  const doc = getPublicDocSection(section);
  return NextResponse.json(doc, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
