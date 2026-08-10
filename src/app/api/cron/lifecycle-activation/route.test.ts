import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  getEmailLocale: vi.fn().mockReturnValue("en"),
}));

vi.mock("@/lib/lifecycle-email", () => ({
  sendLifecycleTemplateEmail: vi.fn().mockResolvedValue({ sent: true, suppressed: false }),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    isFeatureEnabled: vi.fn().mockResolvedValue(true),
    getEmailTemplateBySlug: vi.fn().mockResolvedValue({ id: "tmpl-1", slug: "welcome-no-stocks" }),
  };
});

vi.mock("@/lib/cron-logging", async () => {
  const { NextResponse } = await import("next/server");
  return {
    withCronLogging: (_name: string, handler: () => Promise<Record<string, unknown>>) => {
      return async () => NextResponse.json(await handler());
    },
    verifyCronAuth: vi.fn().mockReturnValue(null),
  };
});

import { ensureInitialized } from "@/lib/db/client";
import { sendLifecycleTemplateEmail } from "@/lib/lifecycle-email";
import { isFeatureEnabled, getEmailTemplateBySlug } from "@/lib/db";

const mockedEnsureInit = vi.mocked(ensureInitialized);
const mockedSend = vi.mocked(sendLifecycleTemplateEmail);
const mockedIsFeatureEnabled = vi.mocked(isFeatureEnabled);
const mockedGetTemplate = vi.mocked(getEmailTemplateBySlug);

const mockClient = { execute: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  mockedEnsureInit.mockResolvedValue(mockClient as never);
  mockedIsFeatureEnabled.mockResolvedValue(true);
  mockedGetTemplate.mockResolvedValue({ id: "tmpl-1", slug: "welcome-no-stocks" } as never);
  mockedSend.mockResolvedValue({ sent: true, suppressed: false });
});

describe("lifecycle-activation cron", () => {
  it("is skipped when the feature flag is off", async () => {
    mockedIsFeatureEnabled.mockResolvedValue(false);

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/lifecycle-activation");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.skipped).toBe(true);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("is skipped when the template is not found", async () => {
    mockedGetTemplate.mockResolvedValue(null);

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/lifecycle-activation");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.skipped).toBe(true);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("sends the activation email to eligible zero-holdings users", async () => {
    mockClient.execute
      .mockResolvedValueOnce({ rows: [{ id: "u1", email: "a@test.com", display_name: "Alice" }] })
      .mockResolvedValueOnce({ rows: [{ language: "es" }] });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/lifecycle-activation");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "welcome-no-stocks", userId: "u1", email: "a@test.com" }),
    );
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
  });

  it("handles an empty eligible set", async () => {
    mockClient.execute.mockResolvedValueOnce({ rows: [] });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/lifecycle-activation");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.sent).toBe(0);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("counts a failed send as an error", async () => {
    mockClient.execute
      .mockResolvedValueOnce({ rows: [{ id: "u1", email: "a@test.com", display_name: "Alice" }] })
      .mockResolvedValueOnce({ rows: [] });
    mockedSend.mockResolvedValueOnce({ sent: false, suppressed: false });

    const mod = await import("./route");
    const req = new NextRequest("http://localhost/api/cron/lifecycle-activation");
    const res = await (mod.GET as (req: NextRequest) => Promise<Response>)(req);
    const body = await res.json();

    expect(body.errors).toBe(1);
    expect(body.sent).toBe(0);
  });
});
