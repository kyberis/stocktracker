import { getPlatformSetting, setPlatformSetting } from "@/lib/db";

export interface FinPulseHandle {
  handle: string;
  displayName: string;
  tags: string[];
}

export const DEFAULT_FINPULSE_HANDLES: FinPulseHandle[] = [
  { handle: "federalreserve", displayName: "Federal Reserve", tags: ["macro", "rates"] },
  { handle: "RayDalio", displayName: "Ray Dalio", tags: ["macro"] },
  { handle: "elonmusk", displayName: "Elon Musk", tags: ["equities"] },
  { handle: "jimcramer", displayName: "Jim Cramer", tags: ["equities"] },
  { handle: "JeromeHPowell", displayName: "Jerome Powell", tags: ["macro", "rates"] },
  { handle: "markets", displayName: "Bloomberg Markets", tags: ["macro"] },
];

const PLATFORM_KEY = "aid_finpulse_handles";
const MAX_HANDLES = 25;
const HANDLE_RE = /^[a-zA-Z0-9_]{1,15}$/;

export function normalizeFinPulseHandles(raw: FinPulseHandle[]): FinPulseHandle[] {
  const seen = new Set<string>();
  const out: FinPulseHandle[] = [];
  for (const h of raw) {
    const handle = String(h.handle || "")
      .replace(/^@/, "")
      .trim();
    if (!handle || !HANDLE_RE.test(handle)) continue;
    const key = handle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const tags = Array.isArray(h.tags)
      ? [...new Set(h.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean))].slice(0, 8)
      : [];
    out.push({
      handle,
      displayName: String(h.displayName || handle).slice(0, 80),
      tags,
    });
    if (out.length >= MAX_HANDLES) break;
  }
  return out;
}

export async function listFinPulseHandles(): Promise<FinPulseHandle[]> {
  const raw = await getPlatformSetting(PLATFORM_KEY);
  if (!raw?.trim()) return DEFAULT_FINPULSE_HANDLES;
  try {
    const parsed = JSON.parse(raw) as FinPulseHandle[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FINPULSE_HANDLES;
    const normalized = normalizeFinPulseHandles(parsed);
    return normalized.length > 0 ? normalized : DEFAULT_FINPULSE_HANDLES;
  } catch {
    return DEFAULT_FINPULSE_HANDLES;
  }
}

export async function setFinPulseHandles(handles: FinPulseHandle[]): Promise<FinPulseHandle[]> {
  const cleaned = normalizeFinPulseHandles(handles);
  if (cleaned.length === 0) {
    await setPlatformSetting(PLATFORM_KEY, "");
    return DEFAULT_FINPULSE_HANDLES;
  }
  await setPlatformSetting(PLATFORM_KEY, JSON.stringify(cleaned));
  return cleaned;
}

export async function resetFinPulseHandles(): Promise<FinPulseHandle[]> {
  await setPlatformSetting(PLATFORM_KEY, "");
  return DEFAULT_FINPULSE_HANDLES;
}

export async function isFinPulseHandlesCustomized(): Promise<boolean> {
  const raw = await getPlatformSetting(PLATFORM_KEY);
  return Boolean(raw?.trim());
}

export function displayHandle(handle: string): string {
  return handle.startsWith("@") ? handle : `@${handle}`;
}
