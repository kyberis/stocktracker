import { createHash, randomBytes } from "crypto";

export const PRODOPS_TELEGRAM_LINK_TTL_MINUTES = 15;
const TELEGRAM_DEEP_LINK_START_MAX_LEN = 64;

export function normalizeProdOpsBotUsername(value: string): string {
  return value.trim().replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 64);
}

export function generateProdOpsLinkToken(): string {
  return randomBytes(18).toString("base64url").replace(/=/g, "").slice(0, 24);
}

export function hashProdOpsLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildProdOpsTelegramDeepLink(botUsername: string, token: string): string {
  const handle = normalizeProdOpsBotUsername(botUsername);
  if (!handle) {
    throw new Error("ProdOps Telegram bot username is not configured");
  }
  if (token.length > TELEGRAM_DEEP_LINK_START_MAX_LEN) {
    throw new Error(
      `ProdOps Telegram link payload exceeds ${TELEGRAM_DEEP_LINK_START_MAX_LEN} characters`,
    );
  }
  return `https://t.me/${handle}?start=${encodeURIComponent(token)}`;
}
