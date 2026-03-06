/**
 * Pushes metrics to Grafana Cloud via OTLP/HTTP JSON.
 * Silently no-ops when GRAFANA_CLOUD_OTLP_URL is not set.
 */

const NANOS_PER_MS = 1_000_000;

function getConfig() {
  const url = process.env.GRAFANA_CLOUD_OTLP_URL;
  const instanceId = process.env.GRAFANA_CLOUD_INSTANCE_ID;
  const token = process.env.GRAFANA_CLOUD_API_TOKEN;
  if (!url || !instanceId || !token) return null;
  return { url: url.replace(/\/$/, ""), instanceId, token };
}

function authHeader(instanceId: string, token: string): string {
  return "Basic " + Buffer.from(`${instanceId}:${token}`).toString("base64");
}

function nowNanos(): string {
  return String(Date.now() * NANOS_PER_MS);
}

interface DataPoint {
  name: string;
  description?: string;
  unit?: string;
  attributes: Record<string, string>;
  value: number;
  isGauge?: boolean;
}

function buildOtlpPayload(points: DataPoint[]) {
  const metrics = points.map((p) => {
    const attrs = Object.entries(p.attributes).map(([key, value]) => ({
      key,
      value: { stringValue: value },
    }));

    const dataPoint = {
      attributes: attrs,
      timeUnixNano: nowNanos(),
      startTimeUnixNano: nowNanos(),
      ...(p.isGauge
        ? { asDouble: p.value }
        : { asInt: String(Math.round(p.value)) }),
    };

    if (p.isGauge) {
      return {
        name: p.name,
        description: p.description || "",
        unit: p.unit || "",
        gauge: { dataPoints: [dataPoint] },
      };
    }

    return {
      name: p.name,
      description: p.description || "",
      unit: p.unit || "",
      sum: {
        dataPoints: [dataPoint],
        aggregationTemporality: 1,
        isMonotonic: true,
      },
    };
  });

  return {
    resourceMetrics: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "trefolio" } },
          ],
        },
        scopeMetrics: [
          {
            scope: { name: "trefolio", version: "1.0.0" },
            metrics,
          },
        ],
      },
    ],
  };
}

async function pushToOtlp(points: DataPoint[]): Promise<void> {
  const cfg = getConfig();
  if (!cfg || points.length === 0) return;

  try {
    await fetch(`${cfg.url}/v1/metrics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(cfg.instanceId, cfg.token),
      },
      body: JSON.stringify(buildOtlpPayload(points)),
    });
  } catch {
    // Fire-and-forget: never block the response
  }
}

/* ── Public API ─────────────────────────────────────────────── */

export function pushRequestMetric(
  route: string,
  method: string,
  statusCode: number,
  durationSeconds: number
): void {
  const points: DataPoint[] = [
    {
      name: "trefolio_http_requests_total",
      description: "Total HTTP requests",
      attributes: { route, method, status_code: String(statusCode) },
      value: 1,
    },
    {
      name: "trefolio_http_request_duration_seconds",
      description: "HTTP request duration in seconds",
      unit: "s",
      attributes: { route, method },
      value: durationSeconds,
      isGauge: true,
    },
  ];
  pushToOtlp(points);
}

export function pushCounter(
  name: string,
  labels: Record<string, string>,
  value = 1
): void {
  pushToOtlp([{ name, attributes: labels, value }]);
}

export function pushGauges(gauges: Record<string, number>): Promise<void>;
export function pushGauges(
  points: { name: string; labels: Record<string, string>; value: number }[]
): Promise<void>;
export function pushGauges(
  arg:
    | Record<string, number>
    | { name: string; labels: Record<string, string>; value: number }[]
): Promise<void> {
  let points: DataPoint[];
  if (Array.isArray(arg)) {
    points = arg.map((p) => ({
      name: p.name,
      attributes: p.labels,
      value: p.value,
      isGauge: true,
    }));
  } else {
    points = Object.entries(arg).map(([name, value]) => ({
      name,
      attributes: {},
      value,
      isGauge: true,
    }));
  }
  return pushToOtlp(points);
}

export function isGrafanaCloudConfigured(): boolean {
  return getConfig() !== null;
}
