import { NextResponse, type NextRequest } from "next/server";
import { withMetrics } from "@/lib/with-metrics";
import { requireRealEstateAccess } from "@/lib/real-estate-screening/guard";
import { listZonaCatalogo, zonaToApi } from "@/lib/db/real-estate-screening";
import { seedCatalogIfEmpty } from "@/lib/real-estate-screening/services/ine";
import { zoneSearchScore, zoneSelectable } from "@/lib/real-estate-screening/search";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/real-estate/zones", async (req: NextRequest) => {
  const { session, error } = await requireRealEstateAccess(req);
  if (error || !session) return error;

  await seedCatalogIfEmpty();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(40, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
  const all = await listZonaCatalogo();

  const selectableFirst = [...all].sort((a, b) => {
    const as = zoneSelectable(a) ? 0 : 1;
    const bs = zoneSelectable(b) ? 0 : 1;
    return as - bs || a.distrito.localeCompare(b.distrito) || a.nombre.localeCompare(b.nombre);
  });

  const ranked = q
    ? selectableFirst
        .map((z) => ({ z, score: zoneSearchScore(q, z.nombre, z.distrito) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.z)
    : selectableFirst.filter((z) => z.tipo === "concelho" || z.tipo === "freguesia" || z.tipo === "nuts3");

  return NextResponse.json({
    zones: ranked.slice(0, limit).map(zonaToApi),
  });
});
