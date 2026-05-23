import { describe, expect, it } from "vitest";

import { isLoginAuthRedirect, normalizeSisterAppBaseUrl } from "./sister-app-url";

describe("normalizeSisterAppBaseUrl", () => {
  it("upgrades http production hosts to https", () => {
    expect(normalizeSisterAppBaseUrl("http://clara.trefolio.com/")).toBe("https://clara.trefolio.com");
  });

  it("keeps localhost on http for dev", () => {
    expect(normalizeSisterAppBaseUrl("http://localhost:3001")).toBe("http://localhost:3001");
  });
});

describe("isLoginAuthRedirect", () => {
  it("detects login redirects", () => {
    expect(isLoginAuthRedirect(307, "/login")).toBe(true);
    expect(isLoginAuthRedirect(307, "https://clara.trefolio.com/login")).toBe(true);
  });

  it("ignores https upgrade redirects", () => {
    expect(
      isLoginAuthRedirect(
        308,
        "https://clara.trefolio.com/api/internal/office/savings-summary?sub=x",
      ),
    ).toBe(false);
  });
});
