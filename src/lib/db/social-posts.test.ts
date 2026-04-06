import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockClient = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue({ rows: [], columns: [] }),
  batch: vi.fn().mockResolvedValue([]),
  executeMultiple: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("@/lib/utils", () => ({
  generateId: vi.fn(() => "mock-post-id"),
}));

import {
  createPost,
  updatePost,
  deletePost,
  getPostById,
  listPostsByUser,
  getFeed,
} from "./social-posts";

describe("social-posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.execute.mockResolvedValue({ rows: [], columns: [] });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createPost", () => {
    it("creates a published post with all fields", async () => {
      const post = await createPost("user-1", {
        title: "My Analysis",
        content: "<p>Great stock pick</p>",
        contentFormat: "html",
        visibility: "network",
        postType: "analysis",
        linkUrl: "https://example.com",
        linkTitle: "Source",
        linkImage: "https://example.com/img.jpg",
        isDraft: false,
      });

      expect(post.id).toBe("mock-post-id");
      expect(post.userId).toBe("user-1");
      expect(post.title).toBe("My Analysis");
      expect(post.content).toBe("<p>Great stock pick</p>");
      expect(post.contentFormat).toBe("html");
      expect(post.visibility).toBe("network");
      expect(post.postType).toBe("analysis");
      expect(post.linkUrl).toBe("https://example.com");
      expect(post.isDraft).toBe(false);
      expect(post.publishedAt).toBe("2025-06-15T12:00:00.000Z");
    });

    it("applies default values for optional fields", async () => {
      const post = await createPost("user-1", {
        title: "Simple Post",
        content: "Hello world",
      });

      expect(post.contentFormat).toBe("html");
      expect(post.visibility).toBe("public");
      expect(post.postType).toBe("article");
      expect(post.linkUrl).toBe("");
      expect(post.linkTitle).toBe("");
      expect(post.linkImage).toBe("");
      expect(post.isDraft).toBe(false);
      expect(post.publishedAt).toBe("2025-06-15T12:00:00.000Z");
    });

    it("sets publishedAt to empty when creating as draft", async () => {
      const post = await createPost("user-1", {
        title: "Draft",
        content: "WIP",
        isDraft: true,
      });

      expect(post.isDraft).toBe(true);
      expect(post.publishedAt).toBe("");

      const call = mockClient.execute.mock.calls[0][0];
      const draftArgIndex = 10;
      expect(call.args![draftArgIndex]).toBe(1);
      const publishedAtIndex = 11;
      expect(call.args![publishedAtIndex]).toBeNull();
    });

    it("inserts into social_posts table", async () => {
      await createPost("user-1", { title: "Test", content: "Body" });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("INSERT INTO social_posts");
      expect(call.args![0]).toBe("mock-post-id");
      expect(call.args![1]).toBe("user-1");
      expect(call.args![2]).toBe("Test");
      expect(call.args![3]).toBe("Body");
    });
  });

  describe("updatePost", () => {
    it("returns true when post is updated", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      const result = await updatePost("post-1", "user-1", {
        title: "Updated Title",
      });

      expect(result).toBe(true);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("UPDATE social_posts");
      expect(call.sql).toContain("title = ?");
      expect(call.sql).toContain("updated_at = datetime('now')");
      expect(call.args).toContain("Updated Title");
      expect(call.args).toContain("post-1");
      expect(call.args).toContain("user-1");
    });

    it("returns false when post does not exist or belongs to another user", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 0,
      });

      const result = await updatePost("post-1", "wrong-user", {
        title: "Hacked",
      });
      expect(result).toBe(false);
    });

    it("sets published_at via COALESCE when un-drafting", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      await updatePost("post-1", "user-1", { isDraft: false });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("is_draft = ?");
      expect(call.sql).toContain(
        "published_at = COALESCE(published_at, datetime('now'))"
      );
      expect(call.args).toContain(0);
    });

    it("does not set published_at when setting isDraft to true", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      await updatePost("post-1", "user-1", { isDraft: true });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("is_draft = ?");
      expect(call.sql).not.toContain("published_at = COALESCE");
      expect(call.args).toContain(1);
    });

    it("builds SET clause for multiple fields", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      await updatePost("post-1", "user-1", {
        title: "New Title",
        content: "New Content",
        visibility: "network",
        postType: "trade_idea",
      });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("title = ?");
      expect(call.sql).toContain("content = ?");
      expect(call.sql).toContain("visibility = ?");
      expect(call.sql).toContain("post_type = ?");
    });
  });

  describe("deletePost", () => {
    it("returns true when own post is deleted", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      const result = await deletePost("post-1", "user-1");

      expect(result).toBe(true);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("DELETE FROM social_posts");
      expect(call.sql).toContain("id = ?");
      expect(call.sql).toContain("user_id = ?");
      expect(call.args).toEqual(["post-1", "user-1"]);
    });

    it("returns false when post belongs to another user", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 0,
      });

      const result = await deletePost("post-1", "wrong-user");
      expect(result).toBe(false);
    });
  });

  describe("getPostById", () => {
    it("returns post with author info", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "post-1",
            user_id: "user-1",
            title: "My Post",
            content: "<p>Content</p>",
            content_format: "html",
            visibility: "public",
            post_type: "article",
            link_url: "",
            link_title: "",
            link_image: "",
            is_draft: 0,
            published_at: "2025-06-15T12:00:00Z",
            created_at: "2025-06-15T12:00:00Z",
            updated_at: "2025-06-15T12:00:00Z",
            display_name: "Alice",
            avatar_url: "https://img.example.com/alice.jpg",
            profile_slug: "alice",
            experience_level: "intermediate",
          },
        ],
        columns: [],
      });

      const post = await getPostById("post-1");

      expect(post).not.toBeNull();
      expect(post!.id).toBe("post-1");
      expect(post!.title).toBe("My Post");
      expect(post!.authorName).toBe("Alice");
      expect(post!.authorAvatar).toBe("https://img.example.com/alice.jpg");
      expect(post!.authorSlug).toBe("alice");
      expect(post!.authorExperience).toBe("intermediate");
      expect(post!.visibility).toBe("public");
      expect(post!.postType).toBe("article");
      expect(post!.isDraft).toBe(false);
    });

    it("returns null for non-existent post", async () => {
      const post = await getPostById("no-such-post");
      expect(post).toBeNull();
    });

    it("defaults contentFormat to html when empty", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "post-2",
            user_id: "user-1",
            title: "Test",
            content: "Body",
            content_format: "",
            visibility: "public",
            post_type: "article",
            link_url: "",
            link_title: "",
            link_image: "",
            is_draft: 0,
            published_at: "2025-06-15T12:00:00Z",
            created_at: "2025-06-15T12:00:00Z",
            updated_at: "2025-06-15T12:00:00Z",
            display_name: "Bob",
            avatar_url: "",
            profile_slug: "bob",
            experience_level: "",
          },
        ],
        columns: [],
      });

      const post = await getPostById("post-2");
      expect(post!.contentFormat).toBe("html");
    });
  });

  describe("listPostsByUser", () => {
    const makePostRow = (overrides: Record<string, unknown> = {}) => ({
      id: "post-1",
      user_id: "user-1",
      title: "Post",
      content: "Body",
      content_format: "html",
      visibility: "public",
      post_type: "article",
      link_url: "",
      link_title: "",
      link_image: "",
      is_draft: 0,
      published_at: "2025-06-15T12:00:00Z",
      created_at: "2025-06-15T12:00:00Z",
      updated_at: "2025-06-15T12:00:00Z",
      display_name: "Alice",
      avatar_url: "",
      profile_slug: "alice",
      experience_level: "beginner",
      ...overrides,
    });

    it("owner sees all posts including drafts", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          makePostRow({ id: "p1", is_draft: 0 }),
          makePostRow({ id: "p2", is_draft: 1 }),
        ],
        columns: [],
      });

      const posts = await listPostsByUser("user-1", { viewerId: "user-1" });

      expect(posts).toHaveLength(2);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).not.toContain("is_draft = 0");
      expect(call.sql).not.toContain("visibility");
    });

    it("connected user sees public and network posts, no drafts", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [makePostRow()],
        columns: [],
      });

      await listPostsByUser("user-1", {
        viewerId: "friend-1",
        isConnected: true,
      });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("is_draft = 0");
      expect(call.sql).toContain("IN ('public', 'network')");
    });

    it("stranger sees only public posts, no drafts", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [makePostRow()],
        columns: [],
      });

      await listPostsByUser("user-1", { viewerId: "stranger-1" });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("is_draft = 0");
      expect(call.sql).toContain("visibility = 'public'");
      expect(call.sql).not.toContain("IN ('public', 'network')");
    });

    it("filters by postType when provided", async () => {
      await listPostsByUser("user-1", {
        viewerId: "user-1",
        postType: "trade_idea",
      });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("post_type = ?");
      expect(call.args).toContain("trade_idea");
    });

    it("applies cursor-based pagination", async () => {
      await listPostsByUser("user-1", {
        viewerId: "user-1",
        cursor: "2025-06-14T00:00:00Z",
      });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("published_at < ?");
      expect(call.args).toContain("2025-06-14T00:00:00Z");
    });

    it("caps limit at 50", async () => {
      await listPostsByUser("user-1", { viewerId: "user-1", limit: 100 });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.args![call.args!.length - 1]).toBe(50);
    });
  });

  describe("getFeed", () => {
    it("queries for own posts and public/network connection posts", async () => {
      await getFeed("user-1");

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("p.is_draft = 0");
      expect(call.sql).toContain("p.published_at IS NOT NULL");
      expect(call.sql).toContain("p.user_id = ?");
      expect(call.sql).toContain("p.visibility = 'public'");
      expect(call.sql).toContain("p.visibility = 'network'");
      expect(call.sql).toContain("user_connections");
      expect(call.sql).toContain("status = 'accepted'");
    });

    it("applies cursor-based pagination", async () => {
      await getFeed("user-1", { cursor: "2025-06-14T00:00:00Z" });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("p.published_at < ?");
    });

    it("caps limit at 50", async () => {
      await getFeed("user-1", { limit: 200 });

      const call = mockClient.execute.mock.calls[0][0];
      const lastArg = call.args![call.args!.length - 1];
      expect(lastArg).toBe(50);
    });

    it("defaults limit to 20", async () => {
      await getFeed("user-1");

      const call = mockClient.execute.mock.calls[0][0];
      const lastArg = call.args![call.args!.length - 1];
      expect(lastArg).toBe(20);
    });
  });
});
