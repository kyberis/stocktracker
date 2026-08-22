import { CRON_REGISTRY } from "@/lib/cron-registry";

/** Header sent by the SPA on API calls. */
export const TRAFFIC_SCREEN_HEADER = "x-trefolio-screen";

const CRON_PATH_TO_NAME = new Map(
  CRON_REGISTRY.map((job) => [job.path, job.name] as const),
);

/** Map a client pathname to a bounded screen/source label. */
export function normalizeClientPath(pathname: string): string {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";

  if (path === "/" || path === "/dashboard") return "screen:dashboard";
  if (path === "/landing") return "screen:landing";
  if (path === "/login") return "screen:login";
  if (path === "/signup") return "screen:signup";
  if (path === "/demo") return "screen:demo";
  if (path === "/leaf") return "screen:leaf";
  if (path === "/screener") return "screen:screener";
  if (path === "/warren") return "screen:warren";
  if (path === "/office") return "screen:office";
  if (path === "/network") return "screen:network";
  if (path === "/settings" || path.startsWith("/settings/")) return "screen:settings";
  if (path === "/import" || path.startsWith("/import/")) return "screen:import";
  if (path === "/tools" || path.startsWith("/tools/")) return "screen:tools";
  if (path === "/billing" || path.startsWith("/billing/")) return "screen:billing";
  if (path === "/profile" || path.startsWith("/profile/")) return "screen:profile";
  if (path.startsWith("/admin")) return normalizeAdminPath(path);
  if (path.startsWith("/u/")) return "screen:public_profile";
  if (path.startsWith("/p/")) return "screen:shared_portfolio";
  if (path.startsWith("/chat/")) return "screen:chat";
  if (path.startsWith("/blog")) return "screen:blog";
  if (path === "/analisis" || path.startsWith("/analisis/")) return "screen:analisis";
  if (path.startsWith("/trial/")) return "screen:trial";
  if (path.startsWith("/privacy")) return "screen:privacy";
  if (path.startsWith("/terms")) return "screen:terms";
  if (path.startsWith("/about")) return "screen:about";
  if (path.startsWith("/contact")) return "screen:contact";

  const segment = path.split("/").filter(Boolean)[0];
  if (segment) return `screen:${segment}`;
  return "screen:unknown";
}

function normalizeAdminPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const tab = parts[1] ?? "index";
  return `admin:${tab}`;
}

/** Group a registered API route string into a bounded bucket. */
export function normalizeApiRoute(route: string): string {
  const path = route.split("?")[0] ?? route;

  if (path.startsWith("/api/cron/")) {
    const cronName = CRON_PATH_TO_NAME.get(path) ?? path.replace("/api/cron/", "");
    return `api:cron.${cronName}`;
  }
  if (path.startsWith("/api/webhooks/")) {
    const name = path.replace("/api/webhooks/", "").split("/")[0] || "unknown";
    return `api:webhook.${name}`;
  }
  if (path === "/api/billing/webhook") return "api:webhook.stripe";
  if (path.startsWith("/api/mcp/")) {
    const segment = path.replace("/api/mcp/", "").split("/")[0] || "root";
    return `api:mcp.${segment}`;
  }
  if (path.startsWith("/api/device/")) return "api:device";
  if (path.startsWith("/api/v1/")) {
    const segment = path.replace("/api/v1/", "").split("/")[0] || "root";
    return `api:v1.${segment}`;
  }
  if (path.startsWith("/api/admin/")) {
    return normalizeAdminApiRoute(path);
  }
  if (path.startsWith("/api/auth/")) {
    const segment = path.replace("/api/auth/", "").split("/")[0] || "root";
    return `api:auth.${segment}`;
  }

  const withoutApi = path.replace(/^\/api\//, "");
  const segments = withoutApi.split("/").filter(Boolean);
  if (segments.length === 0) return "api:unknown";

  const staticSegments = segments.filter((s) => !s.startsWith("[") && !s.startsWith("("));
  if (staticSegments.length === 0) {
    return `api:${segments[0]}`;
  }

  if (staticSegments.length === 1) {
    return `api:${staticSegments[0]}`;
  }

  return `api:${staticSegments.slice(0, 2).join(".")}`;
}

function normalizeAdminApiRoute(path: string): string {
  const rest = path.replace("/api/admin/", "");
  const segments = rest.split("/").filter((s) => !s.startsWith("["));
  if (segments.length === 0) return "api:admin";
  if (segments.length === 1) return `api:admin.${segments[0]}`;
  return `api:admin.${segments.slice(0, 2).join(".")}`;
}

/** Infer origin when no client screen header is present. */
export function resolveSourceFromApiPath(apiPathname: string): string {
  const path = apiPathname.split("?")[0] ?? apiPathname;

  if (path.startsWith("/api/cron/")) {
    const cronName = CRON_PATH_TO_NAME.get(path) ?? path.replace("/api/cron/", "");
    return `cron:${cronName}`;
  }
  if (path.startsWith("/api/webhooks/")) {
    const name = path.replace("/api/webhooks/", "").split("/")[0] || "unknown";
    return `webhook:${name}`;
  }
  if (path === "/api/billing/webhook") return "webhook:stripe";
  if (path.startsWith("/api/mcp/")) return "mcp:server";
  if (path.startsWith("/api/device/")) return "device:leaf";
  if (path.startsWith("/api/v1/")) return "public_api:v1";
  if (path.startsWith("/api/admin/")) {
    const tab = path.replace("/api/admin/", "").split("/")[0] || "root";
    return `admin:${tab}`;
  }
  if (path === "/api/analytics/landing") return "screen:landing";
  if (path.startsWith("/api/analytics/")) return "screen:marketing";
  if (path.startsWith("/api/auth/")) return "screen:auth";
  if (path.startsWith("/api/metrics")) return "ops:metrics";
  if (path.startsWith("/api/internal/")) return "internal:service";

  return "unknown";
}

export function sanitizeTrafficLabel(label: string): string {
  return label
    .trim()
    .slice(0, 64)
    .replace(/[^\w:.-]/g, "_");
}

export function formatTrafficNodeLabel(id: string): string {
  const [kind, ...rest] = id.split(":");
  const name = rest.join(":") || kind;
  switch (kind) {
    case "screen":
      return name.replace(/_/g, " ");
    case "cron":
      return `cron · ${name}`;
    case "webhook":
      return `webhook · ${name}`;
    case "mcp":
      return `MCP · ${name}`;
    case "admin":
      return `admin · ${name}`;
    case "api":
      return `/api/${name.replace(/\./g, "/")}`;
    case "device":
      return `device · ${name}`;
    case "public_api":
      return `API v1 · ${name}`;
    case "internal":
      return `internal · ${name}`;
    case "ops":
      return `ops · ${name}`;
    default:
      return id;
  }
}

export function trafficNodeKind(id: string): "screen" | "system" | "api" | "unknown" {
  if (id.startsWith("screen:")) return "screen";
  if (id.startsWith("api:")) return "api";
  if (
    id.startsWith("cron:") ||
    id.startsWith("webhook:") ||
    id.startsWith("mcp:") ||
    id.startsWith("admin:") ||
    id.startsWith("device:") ||
    id.startsWith("public_api:") ||
    id.startsWith("internal:") ||
    id.startsWith("ops:")
  ) {
    return "system";
  }
  return "unknown";
}
