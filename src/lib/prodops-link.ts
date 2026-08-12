import { createHash, randomBytes } from "crypto";

export const PRODOPS_TELEGRAM_LINK_TTL_MINUTES = 15;
export const PRODOPS_TELEGRAM_LINK_TOKEN_LEN = 12;
const TELEGRAM_DEEP_LINK_START_MAX_LEN = 64;

export function normalizeProdOpsBotUsername(value: string): string {
  return value.trim().replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 64);
}

/**
 * Telegram's /start payload is documented as 64 chars, but production webhooks
 * consistently receive only 12 characters from t.me deep links. Tokens must
 * therefore be exactly 12 chars of [0-9a-f] so the hashed value matches what
 * the bot actually forwards.
 */
export function generateProdOpsLinkToken(): string {
  return randomBytes(PRODOPS_TELEGRAM_LINK_TOKEN_LEN / 2).toString("hex");
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
