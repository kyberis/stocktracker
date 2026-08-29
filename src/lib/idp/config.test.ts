import { afterEach, describe, expect, it } from "vitest";
import { resolveIdpUpgradeHref } from "./config";

describe("resolveIdpUpgradeHref", () => {
  const prevIssuer = process.env.IDP_ISSUER;
  const prevBase = process.env.IDP_BASE_URL;

  afterEach(() => {
    if (prevIssuer === undefined) delete process.env.IDP_ISSUER;
    else process.env.IDP_ISSUER = prevIssuer;
    if (prevBase === undefined) delete process.env.IDP_BASE_URL;
    else process.env.IDP_BASE_URL = prevBase;
  });

  it("includes plan, interval, and skipLanding on the IdP upgrade URL", () => {
    process.env.IDP_ISSUER = "https://user.trefolio.com";
    const href = resolveIdpUpgradeHref({
      interval: "annual",
      plan: "wealth",
      skipLanding: true,
    });
    const u = new URL(href);
    expect(u.origin).toBe("https://user.trefolio.com");
    expect(u.pathname).toBe("/upgrade");
    expect(u.searchParams.get("from")).toBe("trefolio");
    expect(u.searchParams.get("interval")).toBe("annual");
    expect(u.searchParams.get("plan")).toBe("wealth");
    expect(u.searchParams.get("skipLanding")).toBe("1");
  });
});
