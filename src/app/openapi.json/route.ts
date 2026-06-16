import { NextResponse } from "next/server";

import { buildPublicOpenApiDocument } from "@/lib/public-api-docs/openapi";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(buildPublicOpenApiDocument(), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
