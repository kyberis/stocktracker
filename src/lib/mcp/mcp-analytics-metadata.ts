import { requiredScopeForMcpTool } from "@/lib/mcp/pat-scopes";

/** Allowlisted argument keys that identify which data was requested (no PII / no payloads). */
const RESOURCE_ARG_KEYS = [
  "ticker",
  "symbol",
  "symbols",
  "path",
  "portfolioId",
  "year",
  "period",
  "limit",
  "from",
  "to",
  "query",
] as const;

const MAX_VALUE_LEN = 80;

function truncate(value: string): string {
  const t = value.trim();
  if (t.length <= MAX_VALUE_LEN) return t;
  return `${t.slice(0, MAX_VALUE_LEN)}…`;
}

function stringifyArg(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const s = truncate(value);
    return s.length > 0 ? s : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    const parts = value
      .slice(0, 8)
      .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : null))
      .filter((v): v is string => Boolean(v));
    if (parts.length === 0) return null;
    return truncate(parts.join(","));
  }
  return null;
}

/**
 * Build privacy-safe metadata for an MCP tools/call: required scope + allowlisted resource keys.
 */
export function buildMcpToolCallMetadata(
  toolName: string,
  args: unknown,
): Record<string, string> {
  const metadata: Record<string, string> = {};
  const scope = requiredScopeForMcpTool(toolName);
  if (scope) metadata.scope = scope;

  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return metadata;
  }

  const record = args as Record<string, unknown>;
  const resources: string[] = [];

  for (const key of RESOURCE_ARG_KEYS) {
    if (!(key in record)) continue;
    const serialized = stringifyArg(record[key]);
    if (!serialized) continue;
    metadata[key] = serialized;
    resources.push(`${key}=${serialized}`);
  }

  if (resources.length > 0) {
    metadata.resources = truncate(resources.join(";"));
  }

  return metadata;
}

export function formatPatScopesMetadata(scopes: string[] | undefined): Record<string, string> {
  if (!scopes || scopes.length === 0) return {};
  const cleaned = scopes
    .filter((s) => typeof s === "string" && s.length > 0)
    .slice(0, 24)
    .map((s) => s.slice(0, 40));
  if (cleaned.length === 0) return {};
  return { scopes: cleaned.join(",") };
}
