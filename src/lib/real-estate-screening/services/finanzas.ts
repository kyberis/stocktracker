import impuestos from "../config/impuestos.json";
import type { CashflowScenario, FiscalRegime, RateScenario, TipoCompra } from "../schemas";

export type ImpuestosConfig = typeof impuestos;

export function loadImpuestos(): ImpuestosConfig {
  return impuestos;
}

export function cuota(principal: number, tan: number, nMonths: number): number {
  if (principal <= 0 || nMonths <= 0) return 0;
  if (tan <= 0) return principal / nMonths;
  const r = tan / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -nMonths));
}

interface Bracket {
  upTo: number | null;
  rate: number;
  deduct: number;
}

export function imt(price: number, tipo: TipoCompra, cfg: ImpuestosConfig = impuestos): number {
  const table: { brackets: Bracket[] } =
    tipo === "primera_vivienda" ? cfg.imtPrimeraVivienda : cfg.imtSegundaVivienda;
  if (price <= 0) return 0;
  for (const b of table.brackets) {
    if (b.upTo == null || price <= b.upTo) {
      const tax = price * b.rate - b.deduct;
      return Math.max(0, tax);
    }
  }
  return 0;
}

export function costesCompra(price: number, tipo: TipoCompra, cfg: ImpuestosConfig = impuestos): number {
  return imt(price, tipo, cfg) + cfg.impostoSeloPct * price + cfg.gastosRegistroEur;
}

export function cashflowMensual(opts: {
  rentaFirmada: number;
  precio: number;
  principal: number;
  tan: number;
  nMonths: number;
  irsTasa: number;
  cfg?: ImpuestosConfig;
}): {
  cuota: number;
  rentaEfectiva: number;
  gastos: number;
  irs: number;
  cashflow: number;
  cobertura: number;
} {
  const cfg = opts.cfg ?? impuestos;
  const c = cuota(opts.principal, opts.tan, opts.nMonths);
  const rentaEfectiva = opts.rentaFirmada * (1 - cfg.vacancia);
  const gastos =
    (opts.precio * cfg.imiPctSobrePrecio) / 12 +
    cfg.seguroAnualEur / 12 +
    cfg.condominioMensualEur +
    cfg.mantenimientoSobreRenta * opts.rentaFirmada;
  const irs = (opts.rentaFirmada * 12 * opts.irsTasa) / 12;
  const cf = rentaEfectiva - gastos - irs - c;
  return {
    cuota: c,
    rentaEfectiva,
    gastos,
    irs,
    cashflow: cf,
    cobertura: c > 0 ? rentaEfectiva / c : 0,
  };
}

export function rateFor(scenario: RateScenario, cfg: ImpuestosConfig = impuestos): number {
  if (scenario === "variavel") return cfg.tipos.variavel;
  if (scenario === "fixa") return cfg.tipos.fixa;
  return cfg.tipos.variavel + cfg.tipos.stressAddPp;
}

export function buildScenarios(opts: {
  rentaFirmada: number;
  precio: number;
  principal: number;
  nMonths: number;
  irsTasa: number;
  cfg?: ImpuestosConfig;
}): CashflowScenario[] {
  const cfg = opts.cfg ?? impuestos;
  return (["variavel", "fixa", "stress"] as const).map((scenario) => {
    const tan = rateFor(scenario, cfg);
    const m = cashflowMensual({ ...opts, tan, cfg });
    return {
      scenario,
      tan,
      cuota: m.cuota,
      rentaEfectiva: m.rentaEfectiva,
      gastos: m.gastos,
      irs: m.irs,
      cashflow: m.cashflow,
      cobertura: m.cobertura,
      formula: "renta − vacancia − gastos − IRS − cuota",
    };
  });
}

export function pickFiscalRegime(opts: {
  rentaPedida: number;
  areaM2: number;
  rentaIneM2: number | null;
  cfg?: ImpuestosConfig;
}): { mejor: FiscalRegime; alternativa: FiscalRegime } {
  const cfg = opts.cfg ?? impuestos;
  const topeRsaa =
    opts.rentaIneM2 != null ? opts.rentaIneM2 * opts.areaM2 * cfg.rsaaTopeSobreMedianaM2 : null;
  const rsaaEligible = topeRsaa != null && opts.rentaPedida <= topeRsaa + 1e-6;
  const rsaaRenta = rsaaEligible ? opts.rentaPedida : topeRsaa != null ? topeRsaa : opts.rentaPedida;
  const rsaa: FiscalRegime = {
    kind: "rsaa_0",
    tasa: cfg.rsaaTasa,
    irsAnual: rsaaRenta * 12 * cfg.rsaaTasa,
    rentaUsada: rsaaRenta,
    eligible: rsaaEligible || topeRsaa != null,
    note:
      topeRsaa == null
        ? "RSAA not evaluated — no INE rent median"
        : rsaaEligible
          ? "Rent at or below 80% of municipal median × area"
          : "Would require lowering rent to the RSAA cap",
  };
  const moderada: FiscalRegime = {
    kind: "renda_moderada_10",
    tasa: cfg.rendaModeradaTasa,
    irsAnual: opts.rentaPedida * 12 * cfg.rendaModeradaTasa,
    rentaUsada: opts.rentaPedida,
    eligible: true,
    note: "10% IRS on gross rent (renda moderada)",
  };
  const rsaaNet = rsaaRenta * 12 - rsaa.irsAnual;
  const modNet = opts.rentaPedida * 12 - moderada.irsAnual;
  if (rsaa.eligible && rsaaNet >= modNet) {
    return { mejor: rsaa, alternativa: moderada };
  }
  return { mejor: moderada, alternativa: rsaa };
}
