import { describe, expect, it } from "vitest";

import {
  normalizeApiRoute,
  normalizeClientPath,
  resolveSourceFromApiPath,
  sanitizeTrafficLabel,
} from "./normalize";

describe("normalizeClientPath", () => {
  it("maps dashboard routes", () => {
    expect(normalizeClientPath("/")).toBe("screen:dashboard");
    expect(normalizeClientPath("/dashboard")).toBe("screen:dashboard");
    expect(normalizeClientPath("/warren")).toBe("screen:warren");
    expect(normalizeClientPath("/screener")).toBe("screen:screener");
  });

  it("maps dynamic routes", () => {
    expect(normalizeClientPath("/u/jane")).toBe("screen:public_profile");
    expect(normalizeClientPath("/p/abc123")).toBe("screen:shared_portfolio");
    expect(normalizeClientPath("/chat/room-1")).toBe("screen:chat");
  });

  it("maps admin tabs", () => {
    expect(normalizeClientPath("/admin/traffic")).toBe("admin:traffic");
    expect(normalizeClientPath("/admin/users/abc")).toBe("admin:users");
  });
});

describe("normalizeApiRoute", () => {
  it("groups static API routes", () => {
    expect(normalizeApiRoute("/api/quote")).toBe("api:quote");
    expect(normalizeApiRoute("/api/warren/chat")).toBe("api:warren.chat");
  });

  it("groups cron routes", () => {
    expect(normalizeApiRoute("/api/cron/refresh-holdings")).toBe("api:cron.refresh-holdings");
  });

  it("groups admin API routes", () => {
    expect(normalizeApiRoute("/api/admin/traffic-graph")).toBe("api:admin.traffic-graph");
    expect(normalizeApiRoute("/api/admin/users/[userId]/history")).toBe("api:admin.users.history");
  });

  it("groups webhooks", () => {
    expect(normalizeApiRoute("/api/billing/webhook")).toBe("api:webhook.stripe");
    expect(normalizeApiRoute("/api/webhooks/resend")).toBe("api:webhook.resend");
  });
});

describe("resolveSourceFromApiPath", () => {
  it("infers cron origin", () => {
    expect(resolveSourceFromApiPath("/api/cron/push-gauges")).toBe("cron:push-gauges");
  });

  it("infers webhook origin", () => {
    expect(resolveSourceFromApiPath("/api/billing/webhook")).toBe("webhook:stripe");
  });

  it("infers admin API origin", () => {
    expect(resolveSourceFromApiPath("/api/admin/analytics")).toBe("admin:analytics");
  });
});

describe("sanitizeTrafficLabel", () => {
  it("strips unsafe characters and truncates", () => {
    expect(sanitizeTrafficLabel(" screen:dashboard ")).toBe("screen:dashboard");
    expect(sanitizeTrafficLabel("bad label!@#")).toBe("bad_label___");
  });
});
