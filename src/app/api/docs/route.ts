import { NextResponse } from "next/server";

import { buildPublicDocsIndex } from "@/lib/public-api-docs";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(buildPublicDocsIndex(), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
