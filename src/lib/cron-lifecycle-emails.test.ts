import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendTrialInvitationEmail: vi.fn(),
  getEmailLocale: vi.fn().mockReturnValue("en"),
}));

vi.mock("@/lib/lifecycle-email", () => ({
  sendLifecycleTemplateEmail: vi.fn(),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    isFeatureEnabled: vi.fn().mockResolvedValue(false),
    getEmailTemplateBySlug: vi.fn(),
  };
});

import { isFeatureEnabled } from "@/lib/db";
import { runLifecycleEmailsJob } from "./cron-lifecycle-emails";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isFeatureEnabled).mockResolvedValue(false);
});

describe("runLifecycleEmailsJob", () => {
  it("runs the three legs sequentially and returns per-leg results", async () => {
    const result = await runLifecycleEmailsJob();
    expect(result).toEqual({
      invitations: { skipped: true, reason: "commerce_enabled flag is off" },
      activation: { skipped: true, reason: "lifecycle_activation_email_enabled flag is off" },
      winback: { skipped: true, reason: "lifecycle_winback_email_enabled flag is off" },
    });
  });
});
