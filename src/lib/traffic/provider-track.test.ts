import { beforeEach, describe, expect, it, vi } from "vitest";

import { runWithTrafficApiGroup } from "./request-context";
import { trackTrafficEdge } from "./track";
import { recordProviderRequest, trackExternalProvider } from "./provider-track";

vi.mock("./track", () => ({
  trackTrafficEdge: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  providerRequestsTotal: { inc: vi.fn() },
}));

describe("provider-track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recordProviderRequest tracks api_provider when context is set", () => {
    runWithTrafficApiGroup("api:quote", () => {
      recordProviderRequest("yahoo", "quote", "success");
    });

    expect(trackTrafficEdge).toHaveBeenCalledWith(
      "api_provider",
      "api:quote",
      "provider:yahoo",
    );
  });

  it("recordProviderRequest skips traffic edge without context", () => {
    recordProviderRequest("yahoo", "quote", "success");
    expect(trackTrafficEdge).not.toHaveBeenCalled();
  });

  it("trackExternalProvider records arbitrary providers", () => {
    runWithTrafficApiGroup("api:warren.chat", () => {
      trackExternalProvider("ai_gateway");
    });

    expect(trackTrafficEdge).toHaveBeenCalledWith(
      "api_provider",
      "api:warren.chat",
      "provider:ai_gateway",
    );
  });
});

describe("request-context", () => {
  it("runWithTrafficApiGroup scopes nested calls", () => {
    const seen: string[] = [];
    runWithTrafficApiGroup("api:holdings", () => {
      seen.push("outer");
      runWithTrafficApiGroup("api:quote", () => {
        seen.push("inner");
      });
      seen.push("after-inner");
    });
    expect(seen).toEqual(["outer", "inner", "after-inner"]);
  });
});
