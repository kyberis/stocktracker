import {
  countZonaCatalogo,
  getIneCache,
  listZonaCatalogo,
  upsertIneCache,
  upsertZonaCatalogo,
  type ReZonaRow,
} from "@/lib/db/real-estate-screening";
import type { IneSeriesPoint, ZonaIneDerived } from "../schemas";
import seedCatalog from "../../../../data/re-zona-catalogo-seed.json";
import {
  INE_META_URL,
  INE_RENT_VARCD,
  INE_SALE_VARCD,
  assignParents,
  cagrPct,
  ineDataUrl,
  listPeriodsFrom,
  mean,
  nivelToTipo,
  parseIneDataPayload,
  parseIneMetaGeographies,
  parseDim1,
  yieldBrutaPct,
  type IneDataRow,
} from "./ine-parse";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`INE HTTP ${res.status} for ${url}`);
  return res.json();
}

export async function seedCatalogIfEmpty(): Promise<number> {
  const existing = await countZonaCatalogo();
  if (existing > 0) return existing;
  const rows = (seedCatalog as Array<Omit<ReZonaRow, "syncedAt">>).map((r) => ({
    geocod: r.geocod,
    nombre: r.nombre,
    tipo: r.tipo,
    parentGeocod: r.parentGeocod,
    distrito: r.distrito,
    amMetropolitana: r.amMetropolitana,
    tieneDatosVenta: r.tieneDatosVenta,
    tieneDatosRenta: r.tieneDatosRenta,
  }));
  await upsertZonaCatalogo(rows);
  return rows.length;
}

export async function syncZonaCatalogoFromIne(): Promise<{
  geos: number;
  withSale: number;
  withRent: number;
  lastDim1: string;
}> {
  let meta: unknown;
  try {
    meta = await fetchJson(INE_META_URL);
  } catch (err) {
    const n = await seedCatalogIfEmpty();
    return {
      geos: n,
      withSale: n,
      withRent: n,
      lastDim1: "",
    };
  }
  const { lastDim1, geos } = parseIneMetaGeographies(meta);
  const parents = assignParents(geos);
  const dim1 = lastDim1 || "S5A20261";

  let saleRows: IneDataRow[] = [];
  let rentRows: IneDataRow[] = [];
  try {
    const saleJson = await fetchJson(ineDataUrl(INE_SALE_VARCD, dim1));
    saleRows = parseIneDataPayload(saleJson);
  } catch {
    saleRows = [];
  }
  try {
    const rentJson = await fetchJson(ineDataUrl(INE_RENT_VARCD, dim1));
    rentRows = parseIneDataPayload(rentJson);
  } catch {
    rentRows = [];
  }

  const saleSet = new Set(saleRows.filter((r) => r.valor != null).map((r) => r.geocod));
  const rentSet = new Set(rentRows.filter((r) => r.valor != null).map((r) => r.geocod));

  const catalog = geos
    .map((g) => {
      const tipo = nivelToTipo(g.nivel);
      if (!tipo) return null;
      const p = parents.get(g.geocod);
      return {
        geocod: g.geocod,
        nombre: g.nombre,
        tipo,
        parentGeocod: p?.parent || null,
        distrito: p?.distrito || g.nombre,
        amMetropolitana: p?.metro ?? false,
        tieneDatosVenta: saleSet.has(g.geocod),
        tieneDatosRenta: rentSet.has(g.geocod),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  if (catalog.length === 0) {
    await seedCatalogIfEmpty();
  } else {
    await upsertZonaCatalogo(catalog);
  }

  for (const row of saleRows) {
    await upsertIneCache({
      varcd: INE_SALE_VARCD,
      geocod: row.geocod,
      periodo: dim1,
      valor: row.valor,
    });
  }
  for (const row of rentRows) {
    await upsertIneCache({
      varcd: INE_RENT_VARCD,
      geocod: row.geocod,
      periodo: dim1,
      valor: row.valor,
    });
  }

  return {
    geos: catalog.length,
    withSale: saleSet.size,
    withRent: rentSet.size,
    lastDim1: dim1,
  };
}

async function seriesFor(
  varcd: string,
  geocod: string,
  periods: string[],
): Promise<IneSeriesPoint[]> {
  const cached = await getIneCache(varcd, geocod);
  const byPeriod = new Map(cached.map((c) => [c.periodo, c.valor]));
  const missing = periods.filter((p) => !byPeriod.has(p));
  for (const dim1 of missing) {
    try {
      const json = await fetchJson(ineDataUrl(varcd, dim1));
      const rows = parseIneDataPayload(json);
      const hit = rows.find((r) => r.geocod === geocod);
      const valor = hit ? hit.valor : null;
      await upsertIneCache({ varcd, geocod, periodo: dim1, valor });
      byPeriod.set(dim1, valor);
      // Warm neighbours from the same payload
      for (const row of rows) {
        if (row.geocod === geocod) continue;
        await upsertIneCache({ varcd, geocod: row.geocod, periodo: dim1, valor: row.valor });
      }
    } catch {
      byPeriod.set(dim1, null);
      await upsertIneCache({ varcd, geocod, periodo: dim1, valor: null });
    }
  }
  return periods.map((periodo) => ({
    periodo,
    valor: byPeriod.has(periodo) ? (byPeriod.get(periodo) ?? null) : null,
  }));
}

export function deriveZonaFromSeries(
  geocod: string,
  nombre: string,
  serieVenta: IneSeriesPoint[],
  serieRenta: IneSeriesPoint[],
): ZonaIneDerived {
  const saleVals = serieVenta.map((p) => p.valor).filter((v): v is number => v != null);
  const rentVals = serieRenta.map((p) => p.valor).filter((v): v is number => v != null);
  const precioM2Actual = saleVals.at(-1) ?? null;
  const last20 = saleVals.slice(-20);
  const precioM2Media5a = mean(last20.length >= 4 ? last20 : saleVals);
  const first = saleVals[0] ?? null;
  const years =
    serieVenta.length > 1
      ? Math.max(0.25, (serieVenta.length - 1) / 4)
      : 0;
  const crecimientoPct =
    first != null && precioM2Actual != null && first > 0
      ? ((precioM2Actual - first) / first) * 100
      : null;
  const rentaM2 = rentVals.at(-1) ?? null;
  return {
    geocod,
    nombre,
    precioM2Actual,
    precioM2Media5a,
    crecimientoPct,
    cagrPct: first != null && precioM2Actual != null ? cagrPct(first, precioM2Actual, years) : null,
    primaSobreMediaPct:
      precioM2Actual != null && precioM2Media5a != null && precioM2Media5a > 0
        ? ((precioM2Actual - precioM2Media5a) / precioM2Media5a) * 100
        : null,
    rentaM2,
    yieldBrutaPct: yieldBrutaPct(rentaM2, precioM2Actual),
    serieVenta,
    serieRenta,
    failed: precioM2Actual == null && rentaM2 == null,
    failReason: precioM2Actual == null && rentaM2 == null ? "INE returned no usable points" : null,
  };
}

export async function loadZonaIneDerived(
  zonas: Array<{ geocod: string; nombre: string }>,
  lastDim1 = "S5A20261",
): Promise<ZonaIneDerived[]> {
  const parsed = parseDim1(lastDim1);
  const periods = listPeriodsFrom(2019, 4, parsed ? lastDim1 : "S5A20261");
  const out: ZonaIneDerived[] = [];
  for (const z of zonas) {
    try {
      const [venta, renta] = await Promise.all([
        seriesFor(INE_SALE_VARCD, z.geocod, periods),
        seriesFor(INE_RENT_VARCD, z.geocod, periods),
      ]);
      out.push(deriveZonaFromSeries(z.geocod, z.nombre, venta, renta));
    } catch (err) {
      out.push({
        geocod: z.geocod,
        nombre: z.nombre,
        precioM2Actual: null,
        precioM2Media5a: null,
        crecimientoPct: null,
        cagrPct: null,
        primaSobreMediaPct: null,
        rentaM2: null,
        yieldBrutaPct: null,
        serieVenta: [],
        serieRenta: [],
        failed: true,
        failReason: err instanceof Error ? err.message : "INE fetch failed",
      });
    }
  }
  return out;
}

export { listZonaCatalogo };
