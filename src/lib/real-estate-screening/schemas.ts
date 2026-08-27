import { z } from "zod";

export const TIPO_COMPRA = [
  "segunda_vivienda",
  "primera_vivienda",
  "investimento",
] as const;
export type TipoCompra = (typeof TIPO_COMPRA)[number];

export const PLAZO_CREDITO_ANIOS = [15, 20, 25, 30, 35] as const;
export type PlazoCreditoAnios = (typeof PLAZO_CREDITO_ANIOS)[number];

export const DEFAULT_SCREENING_PARAMS = {
  presupuestoMaxEur: 330_000,
  entradaPct: 20,
  tipoCompra: "segunda_vivienda" as TipoCompra,
  superficieMinM2: 80,
  plazoCreditoAnios: 30 as PlazoCreditoAnios,
};

export const MAX_ZONES_PER_RUN = 5;

export const realEstateScreeningParamsSchema = z.object({
  presupuestoMaxEur: z.number().min(30_000).max(5_000_000),
  entradaPct: z.number().min(0).max(100),
  tipoCompra: z.enum(TIPO_COMPRA),
  superficieMinM2: z.number().int().min(20).max(500),
  plazoCreditoAnios: z.union([
    z.literal(15),
    z.literal(20),
    z.literal(25),
    z.literal(30),
    z.literal(35),
  ]),
});
export type RealEstateScreeningParams = z.infer<typeof realEstateScreeningParamsSchema>;

export const createRealEstateRunBodySchema = z.object({
  zoneGeocods: z.array(z.string().min(1).max(32)).min(1).max(MAX_ZONES_PER_RUN),
  params: realEstateScreeningParamsSchema,
});
export type CreateRealEstateRunBody = z.infer<typeof createRealEstateRunBodySchema>;

export const RE_ZONA_TIPOS = ["nuts2", "nuts3", "concelho", "freguesia"] as const;
export type ReZonaTipo = (typeof RE_ZONA_TIPOS)[number];

export const zonaCatalogoSchema = z.object({
  geocod: z.string(),
  nombre: z.string(),
  tipo: z.enum(RE_ZONA_TIPOS),
  parentGeocod: z.string().nullable(),
  distrito: z.string(),
  amMetropolitana: z.boolean(),
  tieneDatosVenta: z.boolean(),
  tieneDatosRenta: z.boolean(),
  syncedAt: z.string(),
  disabledReason: z.enum(["sin_datos_venta", "sin_datos_renta", "sin_datos"]).nullable(),
});
export type ZonaCatalogo = z.infer<typeof zonaCatalogoSchema>;

export const RE_SCREENING_PHASES = [
  "ine",
  "listings",
  "discounts",
  "rents",
  "finance",
  "report",
] as const;
export type ReScreeningPhase = (typeof RE_SCREENING_PHASES)[number];

export const RE_SCREENING_STATUSES = [
  "pending",
  "running",
  "completed",
  "partial",
  "failed",
] as const;
export type ReScreeningStatus = (typeof RE_SCREENING_STATUSES)[number];

export const RE_STEP_STATUSES = [
  "pending",
  "running",
  "done",
  "failed",
  "skipped",
] as const;
export type ReStepStatus = (typeof RE_STEP_STATUSES)[number];

export const phaseProgressSchema = z.object({
  phase: z.enum(RE_SCREENING_PHASES),
  status: z.enum(RE_STEP_STATUSES),
  label: z.string(),
  countLabel: z.string().optional(),
  error: z.string().nullable().optional(),
});
export type PhaseProgress = z.infer<typeof phaseProgressSchema>;

export const ineSeriesPointSchema = z.object({
  periodo: z.string(),
  valor: z.number().nullable(),
});
export type IneSeriesPoint = z.infer<typeof ineSeriesPointSchema>;

export const zonaIneDerivedSchema = z.object({
  geocod: z.string(),
  nombre: z.string(),
  precioM2Actual: z.number().nullable(),
  precioM2Media5a: z.number().nullable(),
  crecimientoPct: z.number().nullable(),
  cagrPct: z.number().nullable(),
  primaSobreMediaPct: z.number().nullable(),
  rentaM2: z.number().nullable(),
  yieldBrutaPct: z.number().nullable(),
  serieVenta: z.array(ineSeriesPointSchema),
  serieRenta: z.array(ineSeriesPointSchema),
  failed: z.boolean().default(false),
  failReason: z.string().nullable().optional(),
});
export type ZonaIneDerived = z.infer<typeof zonaIneDerivedSchema>;

export const LISTING_FLAGS = [
  "SIN_LICENCA",
  "USUFRUTO",
  "OCUPADO",
  "RECOMPRA",
  "RUINA",
  "PROJETO_CADUCADO",
  "COMERCIAL",
  "PROPOSTAS",
  "TERRENO",
] as const;
export type ListingFlagKind = (typeof LISTING_FLAGS)[number];

export const listingFlagSchema = z.object({
  kind: z.enum(LISTING_FLAGS),
  severity: z.enum(["hard", "soft"]),
  quote: z.string(),
});
export type ListingFlag = z.infer<typeof listingFlagSchema>;

export const RATE_SCENARIOS = ["variavel", "fixa", "stress"] as const;
export type RateScenario = (typeof RATE_SCENARIOS)[number];

export const cashflowScenarioSchema = z.object({
  scenario: z.enum(RATE_SCENARIOS),
  tan: z.number(),
  cuota: z.number(),
  rentaEfectiva: z.number(),
  gastos: z.number(),
  irs: z.number(),
  cashflow: z.number(),
  cobertura: z.number(),
  formula: z.string(),
});
export type CashflowScenario = z.infer<typeof cashflowScenarioSchema>;

export const fiscalRegimeSchema = z.object({
  kind: z.enum(["renda_moderada_10", "rsaa_0", "geral"]),
  tasa: z.number(),
  irsAnual: z.number(),
  rentaUsada: z.number(),
  eligible: z.boolean(),
  note: z.string(),
});
export type FiscalRegime = z.infer<typeof fiscalRegimeSchema>;

export const candidateCardSchema = z.object({
  listingId: z.string(),
  portal: z.string(),
  url: z.string(),
  urlVerified: z.boolean(),
  titulo: z.string(),
  concelho: z.string(),
  geocod: z.string(),
  precio: z.number(),
  areaM2: z.number(),
  areaUtilM2: z.number().nullable(),
  areaUsadaM2: z.number(),
  eurM2: z.number(),
  tipologia: z.string(),
  descuentoVsMedianaPct: z.number().nullable(),
  descuentoVsMedia5aPct: z.number().nullable(),
  rentaEstimada: z.number().nullable(),
  rentaExplicacion: z.string(),
  rentaBajaConfianza: z.boolean(),
  yieldNetaPct: z.number().nullable(),
  cobertura: z.number().nullable(),
  cajaCierre: z.number(),
  scenarios: z.array(cashflowScenarioSchema),
  fiscalMejor: fiscalRegimeSchema,
  fiscalAlternativa: fiscalRegimeSchema,
  flags: z.array(listingFlagSchema),
  searchUrl: z.string().optional(),
});
export type CandidateCard = z.infer<typeof candidateCardSchema>;

export const discardedListingSchema = z.object({
  listingId: z.string(),
  titulo: z.string(),
  url: z.string(),
  geocod: z.string(),
  flags: z.array(listingFlagSchema),
  reason: z.string(),
});
export type DiscardedListing = z.infer<typeof discardedListingSchema>;

export const coberturaSchema = z.object({
  anunciosVistos: z.number(),
  anunciosUnicos: z.number(),
  zonasOk: z.array(z.string()),
  zonasFallidas: z.array(z.object({ geocod: z.string(), nombre: z.string(), reason: z.string() })),
  muestral: z.boolean(),
  notas: z.array(z.string()),
});
export type Cobertura = z.infer<typeof coberturaSchema>;

export const conclusionSchema = z.object({
  title: z.string(),
  body: z.string(),
});
export type Conclusion = z.infer<typeof conclusionSchema>;

export const screeningReportPayloadSchema = z.object({
  conclusions: z.array(conclusionSchema).max(3),
  arithmetic: z.object({
    presupuestoMaxEur: z.number(),
    entradaPct: z.number(),
    entradaEur: z.number(),
    costesCompraTipicos: z.number(),
    cajaCierreTipica: z.number(),
    cuotaVariavel: z.number(),
    cuotaFixa: z.number(),
    cuotaStress: z.number(),
  }),
  brechaPedidoVsFirmado: z.array(
    z.object({
      geocod: z.string(),
      nombre: z.string(),
      tipologia: z.string(),
      pedidoM2: z.number().nullable(),
      firmadoM2: z.number().nullable(),
      brechaPct: z.number().nullable(),
    }),
  ),
  zonas: z.array(zonaIneDerivedSchema),
  candidates: z.array(candidateCardSchema),
  discarded: z.array(discardedListingSchema),
  method: z.object({
    supuestos: z.array(z.string()),
    noCubierto: z.array(z.string()),
  }),
  emptyReason: z.string().nullable(),
});
export type ScreeningReportPayload = z.infer<typeof screeningReportPayloadSchema>;

export const reportStaleAfterDays = 14;
