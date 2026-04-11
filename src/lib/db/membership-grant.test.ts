import { describe, it, expect } from "vitest";
import type { DbUser } from "./helpers";
import { computeMembershipGrantExpiry } from "./users";

function mockUser(partial: Partial<DbUser>): DbUser {
  return {
    id: "u",
    username: "u",
    password_hash: "",
    role: "user",
    must_change_password: 0,
    created_at: "",
    email: "",
    display_name: "",
    avatar_url: "",
    plan: "free",
    stripe_customer_id: "",
    stripe_subscription_id: "",
    plan_expires_at: "",
    ai_calls_this_month: 0,
    ai_calls_reset_at: "",
    ai_calls_today: 0,
    ai_daily_reset_at: "",
    ai_tokens_this_month: 0,
    ai_tokens_today: 0,
    email_verified: 0,
    auth_provider: "credentials",
    google_id: "",
    apple_id: "",
    portfolio_review_count: 0,
    portfolio_review_reset_at: "",
    widget_token_hash: "",
    device_passkey_hash: "",
    device_template_id: "classic-dark",
    device_linked_at: "",
    device_pro_redeemed_at: "",
    device_portfolio_id: "",
    last_active_at: "",
    tax_residency: "",
    onboarding_completed: 0,
    experience_level: "beginner",
    referral_code: "",
    referred_by: "",
    referral_reward_days: 0,
    trial_invited_at: "",
    trial_activated_at: "",
    trial_token: "",
    trial_expired_notified: 0,
    membership_grant_token: "",
    membership_grant_plan: "",
    membership_grant_days: 0,
    membership_grant_created_at: "",
    checklist_dismissed_at: "",
    weekly_digest_enabled: 1,
    profile_slug: "",
    bio: "",
    social_visibility: "private",
    headline: "",
    share_portfolio_value: 0,
    share_holdings: 0,
    allow_comments: 1,
    ...partial,
  };
}

describe("computeMembershipGrantExpiry", () => {
  it("stacks days when same tier and plan_expires_at is in the future", () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString();
    const user = mockUser({ plan: "pro", plan_expires_at: future });
    const out = computeMembershipGrantExpiry(user, "pro", 7);
    const expected = new Date(new Date(future).getTime() + 7 * 86400000).getTime();
    expect(out.getTime()).toBe(expected);
  });

  it("starts from now when effective tier differs from stacked-pro case (lapsed paid → complimentary pro)", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const user = mockUser({ plan: "pro", plan_expires_at: past });
    const before = Date.now();
    const out = computeMembershipGrantExpiry(user, "pro", 14);
    const after = Date.now() + 15 * 86400000;
    expect(out.getTime()).toBeGreaterThanOrEqual(before + 14 * 86400000 - 1000);
    expect(out.getTime()).toBeLessThanOrEqual(after);
  });

  it("starts from now when no future expiry", () => {
    const user = mockUser({ plan: "free", plan_expires_at: "" });
    const before = Date.now();
    const out = computeMembershipGrantExpiry(user, "pro", 30);
    expect(out.getTime()).toBeGreaterThanOrEqual(before + 30 * 86400000 - 2000);
  });
});
