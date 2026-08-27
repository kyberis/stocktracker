import { readFileSync } from "fs";
import { join } from "path";
import type { RealEstateScreeningParams } from "../schemas";
import { classifyFlags, extractUsableAreaM2 } from "./flags";

export interface Listing {
  id: string;
  url: string;
  titulo: string;
  precio: number;
  areaM2: number;
  tipologia: string;
  geocod: string;
  concelho: string;
  description: string;
}

export interface ListingDetail extends Listing {
  html: string;
}

export interface RentListing {
  id: string;
  url: string;
  rent: number;
  m2: number;
  tipologia: string;
  geocod: string;
}

export interface PortalAdapter {
  buscarVentas(zona: { geocod: string; nombre: string }, params: RealEstateScreeningParams): Promise<Listing[]>;
  obtenerFicha(id: string): Promise<ListingDetail>;
  buscarAlquileres(zona: { geocod: string; nombre: string }, tipologia: string): Promise<RentListing[]>;
}

const SALE_SELECTORS = ["article.item", ".item-link", ".item-price", ".item-detail"];
const DETAIL_SELECTORS = [
  ".main-info__title-main",
  ".main-info__title-minor",
  ".info-data-price",
  ".comment .adCommentsLanguage",
];

export function validateSelectors(html: string, selectors: string[]): string[] {
  const missing: string[] = [];
  for (const sel of selectors) {
    const className = sel.split(".").filter(Boolean).pop()?.split(" ")[0];
    if (className && !html.includes(className)) missing.push(sel);
  }
  return missing;
}

function fixturePath(name: string): string {
  return join(process.cwd(), "src/lib/real-estate-screening/fixtures", name);
}

function loadFixture(name: string): string {
  return readFileSync(fixturePath(name), "utf8");
}

function parseListingsFromSearchHtml(html: string, geocod: string, concelho: string): Listing[] {
  const missing = validateSelectors(html, SALE_SELECTORS);
  if (missing.length > 0) {
    throw new Error(`Portal selectors changed: ${missing.join(", ")}`);
  }
  const articles = [...html.matchAll(/<article class="item"[\s\S]*?<\/article>/gi)];
  return articles.map((m, i) => {
    const block = m[0];
    const href = /class="item-link"[^>]*href="([^"]+)"/i.exec(block)?.[1] ?? `/imovel/stub-${i}/`;
    const title = /class="item-link"[^>]*>([^<]+)/i.exec(block)?.[1]?.trim() ?? `Listing ${i}`;
    const priceRaw = /class="item-price"[^>]*>([^<]+)/i.exec(block)?.[1] ?? "0";
    const price = Number(priceRaw.replace(/[^\d]/g, ""));
    const details = [...block.matchAll(/class="item-detail"[^>]*>([^<]+)/gi)].map((d) => d[1].trim());
    const tipo = details.find((d) => /^T\d/i.test(d)) ?? "T2";
    const area = Number((details.find((d) => /m²/.test(d)) ?? "80").replace(/[^\d]/g, "")) || 80;
    const id = /\/imovel\/([^/]+)/.exec(href)?.[1] ?? `stub-${i}`;
    return {
      id,
      url: href.startsWith("http") ? href : `https://www.idealista.pt${href}`,
      titulo: title,
      precio: price,
      areaM2: area,
      tipologia: tipo,
      geocod,
      concelho,
      description: "",
    };
  });
}

function parseDetail(html: string, listing: Listing): ListingDetail {
  const missing = validateSelectors(html, DETAIL_SELECTORS);
  if (missing.length > 0) {
    throw new Error(`Portal detail selectors changed: ${missing.join(", ")}`);
  }
  const title = /class="main-info__title-main"[^>]*>([^<]+)/i.exec(html)?.[1]?.trim() ?? listing.titulo;
  const comment = /class="adCommentsLanguage"[^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1] ?? "";
  const text = comment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { ...listing, titulo: title, description: text, html };
}

/**
 * Production adapter. Returns fixture listings so the report pipeline is
 * testable without scraping. See knowledge/design-docs/real-estate-portal-data-source.md.
 */
export class StubPortalAdapter implements PortalAdapter {
  async buscarVentas(
    zona: { geocod: string; nombre: string },
    params: RealEstateScreeningParams,
  ): Promise<Listing[]> {
    const html = loadFixture("idealista-search.html");
    const listings = parseListingsFromSearchHtml(html, zona.geocod, zona.nombre);
    return listings.filter(
      (l) => l.precio <= params.presupuestoMaxEur && l.areaM2 >= params.superficieMinM2,
    );
  }

  async obtenerFicha(id: string): Promise<ListingDetail> {
    const file = id.includes("trap") ? "idealista-detail-trap.html" : "idealista-detail.html";
    const html = loadFixture(file);
    const base: Listing = {
      id,
      url: `https://www.idealista.pt/imovel/${id}/`,
      titulo: "Stub listing",
      precio: id.includes("trap") ? 210000 : 275000,
      areaM2: 95,
      tipologia: "T2",
      geocod: "1B01512",
      concelho: "Setúbal",
      description: "",
    };
    return parseDetail(html, base);
  }

  async buscarAlquileres(
    zona: { geocod: string; nombre: string },
    _tipologia: string,
  ): Promise<RentListing[]> {
    return [
      { id: "r1", url: "https://www.idealista.pt/imovel/r1/", rent: 950, m2: 85, tipologia: "T2", geocod: zona.geocod },
      { id: "r2", url: "https://www.idealista.pt/imovel/r2/", rent: 1050, m2: 92, tipologia: "T2", geocod: zona.geocod },
      { id: "r3", url: "https://www.idealista.pt/imovel/r3/", rent: 880, m2: 78, tipologia: "T2", geocod: zona.geocod },
      { id: "r4", url: "https://www.idealista.pt/imovel/r4/", rent: 1200, m2: 110, tipologia: "T2", geocod: zona.geocod },
      { id: "r5", url: "https://www.idealista.pt/imovel/r5/", rent: 990, m2: 88, tipologia: "T2", geocod: zona.geocod },
    ];
  }
}

export function getPortalAdapter(): PortalAdapter {
  return new StubPortalAdapter();
}

export { classifyFlags, extractUsableAreaM2 };
