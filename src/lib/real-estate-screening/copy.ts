/**
 * Copy for Portugal real-estate zone screening.
 *
 * Kept out of `src/locales/*` while the feature is flag-gated beta (same
 * pattern as investment screening). English is the base; Spanish is complete;
 * every other language falls back to English.
 */

const en = {
  common: {
    disclaimerShort: "Informational only — not financial, tax, or investment advice.",
    disclaimerFull:
      "This report is for information only. trefolio is not a financial advisor, tax advisor, or real-estate agent. Listing prices change daily. Official INE figures are rolling 12-month medians, not a quote for a specific property. Past price growth does not guarantee future results. Do your own due diligence before any purchase.",
    back: "Back",
    backHome: "Back to home",
    loading: "Loading…",
    notFound: "Not found",
  },
  homeCta: {
    badge: "Beta",
    title: "Screen a Portugal property zone",
    body: "Pick concelhos, set budget and mortgage terms, and get a cash-flow report from INE prices plus listings.",
    cta: "Open zone screening",
  },
  quota: {
    remaining: "{remaining} of {limit} zone screens left this week",
    exhausted: "You have used this week’s zone screens. Try again when the weekly limit resets.",
  },
  entry: {
    title: "Investment screening by zone",
    subtitle: "Portugal — official INE prices plus listing cash-flow.",
    zonesLabel: "Zones",
    zonesHint: "Search a distrito, concelho, or freguesia. You can compare up to {max} neighbouring areas.",
    searchPlaceholder: "Setubal, Lisboa, Porto…",
    noMatches: "No matching zones",
    metroBadge: "Metro area",
    disabledNoSale: "No official sale prices",
    disabledNoRent: "No official rent figures",
    disabledNone: "No official price data",
    adjustParams: "Adjust parameters",
    hideParams: "Hide parameters",
    presupuesto: "Max budget",
    entrada: "Down payment",
    tipoCompra: "Purchase type",
    superficie: "Minimum size",
    plazo: "Mortgage term",
    tipoSegunda: "Second home (investment)",
    tipoPrimera: "Primary residence",
    tipoInvestimento: "Investment purchase",
    years: "{n} years",
    analyze: "Analyze zone",
    needZone: "Select at least one zone with official data.",
    summaryBudget: "{budget} · {entrada}% down · {m2} m² min · {years}y",
    recentTitle: "Recent screens",
    recentEmpty: "No screens yet.",
    groupByDistrict: "Grouped by NUTS 3 / metro area",
  },
  progress: {
    title: "Analyzing zones",
    phases: {
      ine: "Official INE data",
      listings: "Sale listings",
      discounts: "Checking discounts",
      rents: "Comparable rents",
      finance: "Mortgage and cash-flow",
      report: "Report",
    },
    partialBanner: "Some zones failed. The rest of the report is still usable.",
    closeHint: "You can close this tab and come back — the job keeps running on the server.",
  },
  report: {
    title: "Zone screening report",
    staleTitle: "This analysis is older than {n} days",
    staleBody: "Listing prices change daily. Rerun with the same parameters for a fresh snapshot.",
    rerun: "Rerun with these parameters",
    exportCsv: "Export CSV",
    compare: "Compare with another run",
    comparePick: "Pick a completed screen to compare",
    emptyTitle: "No candidates in this cut",
    emptyBody:
      "That is a legitimate result, not an error. The market may already be efficient at this budget, or the size filter is too tight. Adjust parameters and try again.",
    conclusions: "Three takeaways",
    arithmetic: "Deal arithmetic",
    downPayment: "Down payment",
    purchaseCosts: "Purchase costs (IMT + stamp + fees)",
    cashAtClose: "Cash at close",
    installment: "Monthly installment",
    gapTitle: "Asking rent vs signed INE rent",
    creditTable: "Credit and cash-flow",
    fiscalTitle: "Tax regimes: 10% vs RSAA 0%",
    scatterTitle: "Discount vs net yield",
    mapTitle: "Map",
    mapUnavailable: "Map coordinates are not available for this run. Candidates are listed by concelho below.",
    allZones: "All zones",
    candidates: "Candidates by concelho",
    discarded: "Discarded, and why",
    method: "Method, assumptions, and coverage",
    coverageSample: "Listing coverage is a sample, not a census.",
    verified: "Link verified",
    unverified: "Link not verified",
    lowConfidence: "Low-confidence rent estimate",
    formula: "rent − vacancy − costs − IRS − installment",
    sort: "Sort",
  },
};

const es: typeof en = {
  common: {
    disclaimerShort: "Solo informativo — no es asesoramiento financiero, fiscal ni de inversión.",
    disclaimerFull:
      "Este informe es solo informativo. trefolio no es asesor financiero, fiscal ni inmobiliario. Los precios de los anuncios cambian a diario. Las cifras del INE son medianas móviles de 12 meses, no una tasación de un inmueble concreto. La revalorización pasada no garantiza resultados futuros. Haz tu propia diligencia antes de comprar.",
    back: "Volver",
    backHome: "Volver al inicio",
    loading: "Cargando…",
    notFound: "No encontrado",
  },
  homeCta: {
    badge: "Beta",
    title: "Cribado de zona inmobiliaria en Portugal",
    body: "Elige concelhos, fija presupuesto e hipoteca, y recibe un informe de caja con precios del INE y anuncios.",
    cta: "Abrir cribado por zona",
  },
  quota: {
    remaining: "Te quedan {remaining} de {limit} cribados de zona esta semana",
    exhausted: "Has usado los cribados de zona de esta semana. Vuelve cuando se reinicie el límite semanal.",
  },
  entry: {
    title: "Cribado de inversión por zona",
    subtitle: "Portugal — precios oficiales del INE más caja de anuncios.",
    zonesLabel: "Zonas",
    zonesHint: "Busca un distrito, concelho o freguesia. Puedes comparar hasta {max} zonas vecinas.",
    searchPlaceholder: "Setubal, Lisboa, Porto…",
    noMatches: "Ninguna zona coincide",
    metroBadge: "Área metropolitana",
    disabledNoSale: "Sin precios de venta oficiales",
    disabledNoRent: "Sin rentas oficiales",
    disabledNone: "Sin datos oficiales de precio",
    adjustParams: "Ajustar parámetros",
    hideParams: "Ocultar parámetros",
    presupuesto: "Presupuesto máximo",
    entrada: "Entrada",
    tipoCompra: "Tipo de compra",
    superficie: "Superficie mínima",
    plazo: "Plazo del crédito",
    tipoSegunda: "Segunda vivienda (inversión)",
    tipoPrimera: "Primera vivienda",
    tipoInvestimento: "Compra de inversión",
    years: "{n} años",
    analyze: "Analizar zona",
    needZone: "Selecciona al menos una zona con datos oficiales.",
    summaryBudget: "{budget} · entrada {entrada}% · mín. {m2} m² · {years} años",
    recentTitle: "Cribados recientes",
    recentEmpty: "Aún no hay cribados.",
    groupByDistrict: "Agrupado por NUTS 3 / área metropolitana",
  },
  progress: {
    title: "Analizando zonas",
    phases: {
      ine: "Datos oficiales del INE",
      listings: "Anuncios de venta",
      discounts: "Verificando descuentos",
      rents: "Alquileres comparables",
      finance: "Crédito y cash-flow",
      report: "Informe",
    },
    partialBanner: "Algunas zonas fallaron. El resto del informe sigue siendo usable.",
    closeHint: "Puedes cerrar esta pestaña y volver: el trabajo sigue en el servidor.",
  },
  report: {
    title: "Informe de cribado por zona",
    staleTitle: "Este análisis tiene más de {n} días",
    staleBody: "Los anuncios cambian a diario. Relanza con los mismos parámetros para un recorte fresco.",
    rerun: "Relanzar con estos parámetros",
    exportCsv: "Exportar CSV",
    compare: "Comparar con otro análisis",
    comparePick: "Elige un cribado terminado para comparar",
    emptyTitle: "No hubo candidatos en este recorte",
    emptyBody:
      "No es un error: es un resultado legítimo. El mercado puede estar eficiente a este presupuesto, o el filtro de superficie es demasiado alto. Ajusta parámetros y vuelve a lanzar.",
    conclusions: "Tres conclusiones",
    arithmetic: "Aritmética de la operación",
    downPayment: "Entrada",
    purchaseCosts: "Costes de compra (IMT + sello + gestoría)",
    cashAtClose: "Caja al cierre",
    installment: "Cuota mensual",
    gapTitle: "Brecha pedido vs renta firmada (INE)",
    creditTable: "Crédito y cash-flow",
    fiscalTitle: "Comparación fiscal: 10 % vs RSAA 0 %",
    scatterTitle: "Dispersión descuento vs yield neta",
    mapTitle: "Mapa",
    mapUnavailable: "No hay coordenadas para este análisis. Los candidatos están agrupados por concelho abajo.",
    allZones: "Todas las zonas",
    candidates: "Candidatos por concelho",
    discarded: "Descartados y por qué",
    method: "Método, supuestos y cobertura",
    coverageSample: "La cobertura de anuncios es muestral, no un censo.",
    verified: "Enlace verificado",
    unverified: "Enlace no verificado",
    lowConfidence: "Estimación de renta de baja confianza",
    formula: "renta − vacancia − gastos − IRS − cuota",
    sort: "Ordenar",
  },
};

export type RealEstateCopy = typeof en;

const BY_LANGUAGE: Record<string, RealEstateCopy> = { en, es };

export function getRealEstateCopy(language: string | undefined): RealEstateCopy {
  const base = (language || "en").toLowerCase().split("-")[0];
  return BY_LANGUAGE[base] ?? en;
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
