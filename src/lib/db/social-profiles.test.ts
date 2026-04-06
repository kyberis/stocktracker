import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClient = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue({ rows: [], columns: [] }),
  batch: vi.fn().mockResolvedValue([]),
  executeMultiple: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

import {
  isValidSlug,
  getSocialProfile,
  getPublicProfileBySlug,
  updateSocialProfile,
  isSlugAvailable,
} from "./social-profiles";

describe("social-profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.execute.mockResolvedValue({ rows: [], columns: [] });
  });

  describe("isValidSlug", () => {
    it("accepts a simple lowercase alphanumeric slug", () => {
      expect(isValidSlug("john-doe")).toBe(true);
      expect(isValidSlug("trader42")).toBe(true);
      expect(isValidSlug("abc")).toBe(true);
    });

    it("accepts slug with hyphens in the middle", () => {
      expect(isValidSlug("my-cool-profile")).toBe(true);
    });

    it("rejects slugs shorter than 3 chars", () => {
      expect(isValidSlug("ab")).toBe(false);
      expect(isValidSlug("a")).toBe(false);
    });

    it("rejects slugs starting or ending with a hyphen", () => {
      expect(isValidSlug("-abc")).toBe(false);
      expect(isValidSlug("abc-")).toBe(false);
    });

    it("rejects slugs with uppercase letters", () => {
      expect(isValidSlug("John")).toBe(false);
      expect(isValidSlug("ALLCAPS")).toBe(false);
    });

    it("rejects slugs with special characters", () => {
      expect(isValidSlug("user@name")).toBe(false);
      expect(isValidSlug("user.name")).toBe(false);
      expect(isValidSlug("user_name")).toBe(false);
    });

    it("rejects double hyphens", () => {
      expect(isValidSlug("my--slug")).toBe(false);
      expect(isValidSlug("a--b--c")).toBe(false);
    });

    it("rejects reserved words", () => {
      expect(isValidSlug("admin")).toBe(false);
      expect(isValidSlug("api")).toBe(false);
      expect(isValidSlug("login")).toBe(false);
      expect(isValidSlug("signup")).toBe(false);
      expect(isValidSlug("network")).toBe(false);
      expect(isValidSlug("settings")).toBe(false);
      expect(isValidSlug("profile")).toBe(false);
      expect(isValidSlug("demo")).toBe(false);
      expect(isValidSlug("help")).toBe(false);
      expect(isValidSlug("support")).toBe(false);
      expect(isValidSlug("terms")).toBe(false);
      expect(isValidSlug("privacy")).toBe(false);
      expect(isValidSlug("blog")).toBe(false);
    });

    it("rejects slugs longer than 40 chars", () => {
      expect(isValidSlug("a".repeat(41))).toBe(false);
    });

    it("accepts slug at max length of 40 chars", () => {
      expect(isValidSlug("a".repeat(40))).toBe(true);
    });
  });

  describe("getSocialProfile", () => {
    it("returns profile data with connection and post counts", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "user-1",
            display_name: "Alice",
            avatar_url: "https://img.example.com/alice.jpg",
            profile_slug: "alice",
            bio: "Investor & trader",
            headline: "Senior Trader",
            social_visibility: "public",
            experience_level: "experienced",
            share_portfolio_value: 1,
            share_holdings: 0,
            connection_count: 42,
            post_count: 7,
          },
        ],
        columns: [],
      });

      const profile = await getSocialProfile("user-1");
      expect(profile).not.toBeNull();
      expect(profile!.userId).toBe("user-1");
      expect(profile!.displayName).toBe("Alice");
      expect(profile!.profileSlug).toBe("alice");
      expect(profile!.bio).toBe("Investor & trader");
      expect(profile!.headline).toBe("Senior Trader");
      expect(profile!.socialVisibility).toBe("public");
      expect(profile!.experienceLevel).toBe("experienced");
      expect(profile!.sharePortfolioValue).toBe(true);
      expect(profile!.shareHoldings).toBe(false);
      expect(profile!.connectionCount).toBe(42);
      expect(profile!.postCount).toBe(7);
    });

    it("returns null for non-existent user", async () => {
      mockClient.execute.mockResolvedValueOnce({ rows: [], columns: [] });
      const profile = await getSocialProfile("no-such-user");
      expect(profile).toBeNull();
    });

    it("defaults socialVisibility to private for invalid value", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "user-2",
            display_name: "Bob",
            avatar_url: "",
            profile_slug: "bob",
            bio: "",
            headline: "",
            social_visibility: "something-invalid",
            experience_level: "",
            share_portfolio_value: 0,
            share_holdings: 0,
            connection_count: 0,
            post_count: 0,
          },
        ],
        columns: [],
      });

      const profile = await getSocialProfile("user-2");
      expect(profile!.socialVisibility).toBe("private");
    });
  });

  describe("getPublicProfileBySlug", () => {
    it("returns public profile data including createdAt", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "user-1",
            display_name: "Alice",
            avatar_url: "https://img.example.com/alice.jpg",
            profile_slug: "alice",
            bio: "Bio here",
            headline: "Headline",
            social_visibility: "public",
            experience_level: "beginner",
            share_portfolio_value: 1,
            share_holdings: 1,
            connection_count: 5,
            post_count: 3,
            created_at: "2025-01-01T00:00:00Z",
          },
        ],
        columns: [],
      });

      const profile = await getPublicProfileBySlug("alice");
      expect(profile).not.toBeNull();
      expect(profile!.createdAt).toBe("2025-01-01T00:00:00Z");
      expect(profile!.userId).toBe("user-1");
      expect(profile!.profileSlug).toBe("alice");
    });

    it("returns null for non-existent slug", async () => {
      mockClient.execute.mockResolvedValueOnce({ rows: [], columns: [] });
      const profile = await getPublicProfileBySlug("no-such-slug");
      expect(profile).toBeNull();
    });
  });

  describe("updateSocialProfile", () => {
    it("builds SET clause with provided fields", async () => {
      await updateSocialProfile("user-1", {
        profileSlug: "new-slug",
        headline: "New Headline",
        socialVisibility: "public",
      });

      expect(mockClient.execute).toHaveBeenCalledOnce();
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("profile_slug = ?");
      expect(call.sql).toContain("headline = ?");
      expect(call.sql).toContain("social_visibility = ?");
      expect(call.args).toContain("new-slug");
      expect(call.args).toContain("New Headline");
      expect(call.args).toContain("public");
      expect(call.args![call.args!.length - 1]).toBe("user-1");
    });

    it("truncates bio to 500 chars", async () => {
      const longBio = "x".repeat(600);
      await updateSocialProfile("user-1", { bio: longBio });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.args![0]).toBe("x".repeat(500));
    });

    it("does nothing when no fields provided", async () => {
      await updateSocialProfile("user-1", {});
      expect(mockClient.execute).not.toHaveBeenCalled();
    });

    it("converts boolean sharePortfolioValue to 1/0", async () => {
      await updateSocialProfile("user-1", { sharePortfolioValue: true });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("share_portfolio_value = ?");
      expect(call.args).toContain(1);
    });

    it("converts boolean shareHoldings to 1/0", async () => {
      await updateSocialProfile("user-1", { shareHoldings: false });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("share_holdings = ?");
      expect(call.args).toContain(0);
    });
  });

  describe("isSlugAvailable", () => {
    it("returns true when no user has the slug", async () => {
      const available = await isSlugAvailable("fresh-slug");
      expect(available).toBe(true);
    });

    it("returns false when another user has the slug", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [{ id: "other-user" }],
        columns: [],
      });
      const available = await isSlugAvailable("taken-slug");
      expect(available).toBe(false);
    });

    it("excludes a specific userId when checking", async () => {
      await isSlugAvailable("my-slug", "user-1");

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("id != ?");
      expect(call.args).toEqual(["my-slug", "user-1"]);
    });

    it("does not use excludeUserId in SQL when not provided", async () => {
      await isSlugAvailable("my-slug");

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).not.toContain("id != ?");
      expect(call.args).toEqual(["my-slug"]);
    });
  });
});
