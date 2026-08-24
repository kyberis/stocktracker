import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getClaraAppUrl,
  getClaraLoginUrl,
  getClaraPublicUrl,
} from "./clara-public-url";

describe("clara-public-url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to production Clara origin", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARA_URL", "");
    expect(getClaraPublicUrl()).toBe("https://clara.trefolio.com");
    expect(getClaraAppUrl()).toBe("https://clara.trefolio.com/app");
    expect(getClaraLoginUrl()).toBe("https://clara.trefolio.com/login");
  });

  it("strips trailing slash from override", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARA_URL", "http://localhost:3001/");
    expect(getClaraPublicUrl()).toBe("http://localhost:3001");
    expect(getClaraAppUrl()).toBe("http://localhost:3001/app");
  });
});
