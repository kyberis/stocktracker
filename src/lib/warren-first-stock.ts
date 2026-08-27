/** Sticky experiment: control empty home vs Warren first-stock treatment. */

export const WARREN_FIRST_STOCK_EXPERIMENT_KEY = "warren_first_stock";
export const WARREN_FIRST_STOCK_TREATMENT = "warren_first_stock";
export const ACTIVATE_FIRST_STOCK_PARAM = "activateFirstStock";

export const DEFAULT_FIRST_STOCK_PRICE = 180;

export function isWarrenFirstStockTreatment(variant: string | undefined | null): boolean {
  return variant === WARREN_FIRST_STOCK_TREATMENT;
}

export function shouldOpenWarrenFirstStock(opts: {
  demoMode: boolean;
  isEmpty: boolean;
  activateFlag: boolean;
  variant: string;
  loading: boolean;
}): boolean {
  return (
    !opts.demoMode &&
    opts.isEmpty &&
    opts.activateFlag &&
    !opts.loading &&
    isWarrenFirstStockTreatment(opts.variant)
  );
}

export function skipOnboardingHomePath(): string {
  return `/?${ACTIVATE_FIRST_STOCK_PARAM}=1`;
}

export function formatFirstStockExample(template: string, price: number): string {
  const rounded = Number.isFinite(price) && price > 0 ? Math.round(price) : DEFAULT_FIRST_STOCK_PRICE;
  return template.replace("{price}", String(rounded));
}

export function readActivateFirstStockFlag(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(ACTIVATE_FIRST_STOCK_PARAM) === "1";
}

export function stripActivateFirstStockSearch(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete(ACTIVATE_FIRST_STOCK_PARAM);
  const next = params.toString();
  return next ? `?${next}` : "";
}
