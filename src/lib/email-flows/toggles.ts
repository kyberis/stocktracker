import { getPlatformSetting, isFeatureEnabled, setFeatureEnabled, setPlatformSetting } from "@/lib/db";
import { findEmailNode, listEmailNodes } from "./registry";

export const EMAIL_NODE_TOGGLES_KEY = "email_node_toggles";

async function readToggleMap(): Promise<Record<string, boolean>> {
  const raw = await getPlatformSetting(EMAIL_NODE_TOGGLES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") map[key] = value;
    }
    return map;
  } catch {
    return {};
  }
}

export async function isEmailNodeEnabled(nodeId: string): Promise<boolean> {
  const node = findEmailNode(nodeId);
  if (!node) return true;
  if (node.featureFlag) return isFeatureEnabled(node.featureFlag);
  const map = await readToggleMap();
  if (Object.prototype.hasOwnProperty.call(map, nodeId)) return map[nodeId];
  return true;
}

export async function setEmailNodeEnabled(nodeId: string, enabled: boolean): Promise<void> {
  const node = findEmailNode(nodeId);
  if (!node) throw new Error(`Unknown email node '${nodeId}'`);
  if (node.featureFlag) {
    await setFeatureEnabled(node.featureFlag, enabled);
    return;
  }
  const map = await readToggleMap();
  map[nodeId] = enabled;
  await setPlatformSetting(EMAIL_NODE_TOGGLES_KEY, JSON.stringify(map));
}

export async function getEmailNodeEnabledMap(): Promise<Record<string, boolean>> {
  const map = await readToggleMap();
  const out: Record<string, boolean> = {};
  for (const { node } of listEmailNodes()) {
    if (node.featureFlag) {
      out[node.id] = await isFeatureEnabled(node.featureFlag);
    } else if (Object.prototype.hasOwnProperty.call(map, node.id)) {
      out[node.id] = map[node.id];
    } else {
      out[node.id] = true;
    }
  }
  return out;
}
