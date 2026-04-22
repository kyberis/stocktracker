/**
 * Tests for stable helpers exported from chat-room-view.
 *
 * The full ChatRoomView component test is intentionally scoped to its
 * deterministic helpers here; a fuller reducer-level test will follow once
 * the component is split (Phase 3d).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { USER_COLORS, userColorIndex, isParticipantOnline } from "./chat-room-view";

describe("userColorIndex", () => {
  it("returns an index within the USER_COLORS range", () => {
    for (const id of ["u1", "u2", "user-abc", "0000"]) {
      const idx = userColorIndex(id);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(USER_COLORS.length);
    }
  });

  it("is deterministic for the same userId", () => {
    expect(userColorIndex("stable-user")).toBe(userColorIndex("stable-user"));
  });

  it("produces a uniform-ish distribution across distinct user ids", () => {
    const counts = new Array(USER_COLORS.length).fill(0);
    for (let i = 0; i < 400; i++) {
      counts[userColorIndex(`u-${i}`)]++;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(0);
    }
  });

  it("returns 0 for the empty string", () => {
    expect(userColorIndex("")).toBe(0);
  });
});

describe("isParticipantOnline", () => {
  const NOW = new Date("2025-06-01T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for an empty lastSeenAt", () => {
    expect(isParticipantOnline("")).toBe(false);
  });

  it("returns true when last seen within ~15 seconds", () => {
    const tenSecondsAgo = new Date(NOW - 10_000).toISOString().replace(/Z$/, "");
    expect(isParticipantOnline(tenSecondsAgo)).toBe(true);
  });

  it("returns false when last seen more than 15 seconds ago", () => {
    const twentySecondsAgo = new Date(NOW - 20_000).toISOString().replace(/Z$/, "");
    expect(isParticipantOnline(twentySecondsAgo)).toBe(false);
  });

  it("treats the stored timestamp as UTC (no trailing Z)", () => {
    // The helper appends a Z before parsing. A string without Z must be
    // interpreted as UTC so the online window is consistent across timezones.
    const recent = new Date(NOW - 5_000).toISOString().replace(/Z$/, "");
    expect(isParticipantOnline(recent)).toBe(true);
  });
});
