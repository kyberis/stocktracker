import { describe, expect, it } from "vitest";

import {
  PRODOPS_TELEGRAM_LINK_TOKEN_LEN,
  buildProdOpsTelegramDeepLink,
  generateProdOpsLinkToken,
  hashProdOpsLinkToken,
} from "./prodops-link";

describe("prodops-link tokens", () => {
  it("mints a 12-character hex token that Telegram can forward intact", () => {
    const token = generateProdOpsLinkToken();
    expect(token).toMatch(/^[0-9a-f]+$/);
    expect(token).toHaveLength(PRODOPS_TELEGRAM_LINK_TOKEN_LEN);
  });

  it("builds a t.me start link without truncating the token", () => {
    const token = "a1b2c3d4e5f6";
    expect(buildProdOpsTelegramDeepLink("trefolioopsbot", token)).toBe(
      `https://t.me/trefolioopsbot?start=${token}`,
    );
    expect(hashProdOpsLinkToken(token)).toHaveLength(64);
  });
});
