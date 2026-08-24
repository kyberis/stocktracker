/**
 * Module-level signals so PortfolioProvider can defer duplicate cold-path
 * work while Home bootstrap is in flight.
 */

let pending = false;
let hydratedPortfolioId: string | null | undefined;

/** Home mounted and waiting for `/api/home-v2/bootstrap?phase=core`. */
export function setHomeBootstrapPending(value: boolean): void {
  pending = value;
}

export function isHomeBootstrapPending(): boolean {
  return pending;
}

/** Portfolio book was seeded from bootstrap core (skip init holdings/cash fetch). */
export function markHomeBootstrapBookHydrated(portfolioId: string | null): void {
  hydratedPortfolioId = portfolioId;
}

export function wasHomeBootstrapBookHydrated(portfolioId: string | null): boolean {
  return hydratedPortfolioId === portfolioId;
}

export function clearHomeBootstrapBookHydrated(): void {
  hydratedPortfolioId = undefined;
}
