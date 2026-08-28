import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/auth/guards", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/ai/office/office-identity", () => ({
  resolveOfficeIdentity: vi.fn(),
}));

vi.mock("@/lib/ai/office/clara-client", () => ({
  fetchClaraSavingsSummary: vi.fn(),
}));

import { requireSession } from "@/lib/auth/guards";
import { resolveOfficeIdentity } from "@/lib/ai/office/office-identity";
import { fetchClaraSavingsSummary } from "@/lib/ai/office/clara-client";
import { GET } from "./route";

const mockedSession = vi.mocked(requireSession);
const mockedIdentity = vi.mocked(resolveOfficeIdentity);
const mockedClara = vi.mocked(fetchClaraSavingsSummary);

function req() {
  return new NextRequest("http://localhost/api/clara/status");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedSession.mockResolvedValue({
    session: {
      userId: "u1",
      username: "u",
      email: "u@test.dev",
      role: "user",
      mustChangePassword: false,
      plan: "free",
      emailVerified: true,
      onboardingCompleted: true,
    },
    error: null,
  } as never);
});

describe("GET /api/clara/status", () => {
  it("returns unlinked when identity is missing", async () => {
    mockedIdentity.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ linked: false });
    expect(mockedClara).not.toHaveBeenCalled();
  });

  it("returns aggregated fields when Clara is linked", async () => {
    mockedIdentity.mockResolvedValue({
      idpSub: "sub-1",
      email: "u@test.dev",
      trefolioUserId: "u1",
    } as never);
    mockedClara.mockResolvedValue({
      available: true,
      surplusEur: 420,
      currency: "EUR",
      dayOfMonth: 16,
      daysInMonth: 28,
      monthBalance: 50,
      hasMonthRecord: true,
      remainingExpenses: 200,
    });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      linked: true,
      surplusEur: 420,
      currency: "EUR",
      dayOfMonth: 16,
      daysInMonth: 28,
      monthBalance: 50,
      hasMonthRecord: true,
      remainingExpenses: 200,
    });
  });

  it("returns unlinked when savings-summary is unavailable", async () => {
    mockedIdentity.mockResolvedValue({
      idpSub: "sub-1",
      email: "u@test.dev",
      trefolioUserId: "u1",
    } as never);
    mockedClara.mockResolvedValue({ available: false, note: "No Clara account" });
    const res = await GET(req());
    expect(await res.json()).toEqual({ linked: false });
  });
});
