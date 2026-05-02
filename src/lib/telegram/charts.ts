/**
 * Chart helpers for Telegram. We render Chart.js configurations into PNGs via
 * QuickChart (a hosted Chart.js → image service) and send the resulting URL
 * with `sendPhoto`. This keeps Warren chart support stateless and avoids
 * shipping a headless renderer with the bot.
 *
 * Privacy: the chart payload (currency-tagged numbers + labels) goes to the
 * configured QuickChart host as a query string. No personal identifiers are
 * sent. Self-host QuickChart and set `TELEGRAM_QUICKCHART_BASE_URL` to keep
 * data on-prem; set `TELEGRAM_CHART_IMAGES=0` to disable photo charts entirely
 * (the bot then falls back to text-only renderings).
 *
 * @see https://quickchart.io/documentation/
 */

const DEFAULT_BASE = "https://quickchart.io/chart";

/** Telegram-facing chart spec. Keep it small and serialisable. */
export type TelegramChartSpec =
  | TelegramPieChartSpec
  | TelegramBarChartSpec
  | TelegramLineChartSpec;

export interface TelegramPieChartSpec {
  kind: "pie";
  title: string;
  /** Optional currency suffix shown next to the title (e.g. "EUR"). */
  currency?: string;
  slices: { label: string; value: number; color?: string }[];
}

export interface TelegramBarChartSpec {
  kind: "bar";
  title: string;
  currency?: string;
  labels: string[];
  values: number[];
  /** Render bars horizontally — useful for ticker labels. */
  horizontal?: boolean;
}

export interface TelegramLineChartSpec {
  kind: "line";
  title: string;
  currency?: string;
  labels: string[];
  values: number[];
}

const PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#14b8a6",
  "#f97316",
  "#3b82f6",
  "#ef4444",
];

const MAX_URL_CHARS = 6500;

function quickChartBase(): string {
  const raw = process.env.TELEGRAM_QUICKCHART_BASE_URL?.trim();
  return raw && /^https:\/\//i.test(raw) ? raw.replace(/\/+$/, "") : DEFAULT_BASE;
}

export function isTelegramChartImageEnabled(): boolean {
  const v = process.env.TELEGRAM_CHART_IMAGES?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}

function buildChartJsConfig(spec: TelegramChartSpec): Record<string, unknown> {
  const titleText = spec.currency ? `${spec.title} (${spec.currency})` : spec.title;
  const titlePlugin = {
    display: true,
    text: titleText.slice(0, 120),
    font: { size: 15 },
    padding: { bottom: 8 },
  };

  if (spec.kind === "pie") {
    return {
      type: "pie",
      data: {
        labels: spec.slices.map((s) => s.label.slice(0, 48)),
        datasets: [
          {
            data: spec.slices.map((s) => s.value),
            backgroundColor: spec.slices.map(
              (s, i) => s.color ?? PALETTE[i % PALETTE.length],
            ),
          },
        ],
      },
      options: {
        plugins: {
          title: titlePlugin,
          legend: { position: "bottom", labels: { boxWidth: 12 } },
        },
      },
    };
  }

  if (spec.kind === "bar") {
    return {
      type: "bar",
      data: {
        labels: spec.labels.map((l) => l.slice(0, 32)),
        datasets: [
          {
            data: spec.values,
            backgroundColor: spec.values.map((_, i) => `${PALETTE[i % PALETTE.length]}e6`),
            borderColor: spec.values.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: spec.horizontal ? "y" : "x",
        plugins: { title: titlePlugin, legend: { display: false } },
        scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
      },
    };
  }

  // line
  return {
    type: "line",
    data: {
      labels: spec.labels.map((l) => l.slice(0, 32)),
      datasets: [
        {
          data: spec.values,
          borderColor: PALETTE[0],
          backgroundColor: `${PALETTE[0]}40`,
          fill: true,
          tension: 0.2,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    options: {
      plugins: { title: titlePlugin, legend: { display: false } },
      scales: { y: { beginAtZero: false } },
    },
  };
}

/**
 * Returns an HTTPS PNG URL Telegram can fetch via `sendPhoto`. Returns `null`
 * when chart images are disabled, the URL would exceed QuickChart's safe GET
 * length, or anything else goes wrong.
 */
export function buildTelegramChartUrl(spec: TelegramChartSpec): string | null {
  if (!isTelegramChartImageEnabled()) return null;
  try {
    const config = buildChartJsConfig(spec);
    const encoded = encodeURIComponent(JSON.stringify(config));
    const base = quickChartBase();
    let url = `${base}?c=${encoded}&w=640&h=420&f=png&devicePixelRatio=2&bkg=white`;

    if (url.length > MAX_URL_CHARS) {
      // Drop title/legend to shrink the payload before giving up.
      const compact = {
        ...(config as Record<string, unknown>),
        options: {
          ...((config.options as Record<string, unknown>) ?? {}),
          plugins: {
            title: { display: false },
            legend: { display: false },
          },
        },
      };
      url = `${base}?c=${encodeURIComponent(JSON.stringify(compact))}&w=520&h=320&f=png&bkg=white`;
    }
    if (url.length > MAX_URL_CHARS) return null;
    if (!url.startsWith("https://")) return null;
    return url;
  } catch {
    return null;
  }
}
