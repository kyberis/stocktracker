import { describe, it, expect, vi, afterEach } from "vitest";

const mockExecute = vi.fn();
const mockBatch = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@libsql/client", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock("./migrations", () => ({
  runMigrations: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("Database / Turso chaos", () => {
  describe("createClient failures", () => {
    it("throws when client creation fails", () => {
      mockCreateClient.mockImplementation(() => {
        throw new Error("Connection refused: libsql://fake.turso.io");
      });

      expect(() => mockCreateClient({ url: "libsql://fake" })).toThrow(
        "Connection refused",
      );
    });

    it("throws on invalid URL", () => {
      mockCreateClient.mockImplementation(() => {
        throw new Error("Invalid URL scheme");
      });

      expect(() => mockCreateClient({ url: "bad://url" })).toThrow(
        "Invalid URL scheme",
      );
    });
  });

  describe("execute failures", () => {
    it("rejects on query error", async () => {
      mockExecute.mockRejectedValueOnce(new Error("SQLITE_ERROR: no such table: users"));

      await expect(
        mockExecute({ sql: "SELECT * FROM users", args: [] }),
      ).rejects.toThrow("no such table: users");
    });

    it("rejects on timeout", async () => {
      mockExecute.mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Query timed out")), 10),
        ),
      );

      await expect(
        mockExecute({ sql: "SELECT 1", args: [] }),
      ).rejects.toThrow("Query timed out");
    });

    it("rejects on connection drop", async () => {
      mockExecute.mockRejectedValueOnce(
        new Error("HRANA_WEBSOCKET_ERROR: connection closed"),
      );

      await expect(
        mockExecute({ sql: "SELECT 1", args: [] }),
      ).rejects.toThrow("HRANA_WEBSOCKET_ERROR");
    });
  });

  describe("batch failures", () => {
    it("rejects when batch fails mid-transaction", async () => {
      mockBatch.mockRejectedValueOnce(
        new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email"),
      );

      await expect(
        mockBatch(
          [
            { sql: "INSERT INTO users (id, email) VALUES (?, ?)", args: ["1", "a@b.com"] },
            { sql: "INSERT INTO users (id, email) VALUES (?, ?)", args: ["2", "a@b.com"] },
          ],
          "write",
        ),
      ).rejects.toThrow("UNIQUE constraint failed");
    });

    it("rejects on write-after-close", async () => {
      mockBatch.mockRejectedValueOnce(
        new Error("Cannot write: database is closed"),
      );

      await expect(
        mockBatch([{ sql: "INSERT INTO t VALUES (?)", args: [1] }], "write"),
      ).rejects.toThrow("database is closed");
    });
  });

  describe("migration failures", () => {
    it("propagates migration errors", async () => {
      const mockRunMigrations = vi.fn().mockRejectedValueOnce(
        new Error("Migration v15 failed: syntax error"),
      );

      await expect(mockRunMigrations({} as never)).rejects.toThrow(
        "Migration v15 failed",
      );
    });
  });

  describe("feature flag query failure", () => {
    it("rejects when feature flag table is missing", async () => {
      mockExecute.mockRejectedValueOnce(
        new Error("SQLITE_ERROR: no such table: feature_flags"),
      );

      await expect(
        mockExecute({
          sql: "SELECT enabled FROM feature_flags WHERE name = ?",
          args: ["device_enabled"],
        }),
      ).rejects.toThrow("no such table: feature_flags");
    });

    it("returns empty result (flag not found)", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await mockExecute({
        sql: "SELECT enabled FROM feature_flags WHERE name = ?",
        args: ["nonexistent_flag"],
      });
      expect(result.rows).toHaveLength(0);
    });
  });
});
