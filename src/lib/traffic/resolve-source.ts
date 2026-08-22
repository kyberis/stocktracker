import {
  TRAFFIC_SCREEN_HEADER,
  normalizeClientPath,
  resolveSourceFromApiPath,
  sanitizeTrafficLabel,
} from "./normalize";

/** Resolve bounded traffic origin from an incoming HTTP request. */
export function resolveTrafficSource(req: Request): string {
  const header = req.headers.get(TRAFFIC_SCREEN_HEADER);
  if (header) {
    return sanitizeTrafficLabel(header);
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refPath = new URL(referer).pathname;
      return sanitizeTrafficLabel(normalizeClientPath(refPath));
    } catch {
      // ignore malformed referer
    }
  }

  try {
    const apiPath = new URL(req.url).pathname;
    return sanitizeTrafficLabel(resolveSourceFromApiPath(apiPath));
  } catch {
    return "unknown";
  }
}
