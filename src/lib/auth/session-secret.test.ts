import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

import { existsSync, readFileSync, appendFileSync } from "fs";

const mockExists = existsSync as unknown as ReturnType<typeof vi.fn>;
const mockRead = readFileSync as unknown as ReturnType<typeof vi.fn>;
const mockAppend = appendFileSync as unknown as ReturnType<typeof vi.fn>;

const origEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  delete process.env.APP_SESSION_SECRET;
});

afterEach(() => {
  process.env = { ...origEnv };
});

async function freshImport() {
  const mod = await import("./session-secret");
  return mod.ensureSessionSecret;
}

describe("ensureSessionSecret", () => {
  it("returns env var when APP_SESSION_SECRET is set", async () => {
    process.env.APP_SESSION_SECRET = "my-secret-from-env";
    const ensureSessionSecret = await freshImport();
    const result = ensureSessionSecret();
    expect(result).toBe("my-secret-from-env");
  });

  it("reads from .env.local file when env var not set", async () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("SOME_OTHER=val\nAPP_SESSION_SECRET=file-secret\n");

    const ensureSessionSecret = await freshImport();
    const result = ensureSessionSecret();
    expect(result).toBe("file-secret");
  });

  it("generates and persists a new secret when nothing exists", async () => {
    mockExists.mockReturnValue(false);

    const ensureSessionSecret = await freshImport();
    const result = ensureSessionSecret();
    expect(result).toBeTruthy();
    expect(result.length).toBe(64); // 32 bytes hex
    expect(mockAppend).toHaveBeenCalled();
  });

  it("returns cached secret on second call", async () => {
    process.env.APP_SESSION_SECRET = "cached-secret";
    const ensureSessionSecret = await freshImport();
    const first = ensureSessionSecret();
    const second = ensureSessionSecret();
    expect(first).toBe(second);
  });

  it("handles appendFileSync failure gracefully", async () => {
    mockExists.mockReturnValue(false);
    mockAppend.mockImplementation(() => { throw new Error("disk full"); });

    const ensureSessionSecret = await freshImport();
    const result = ensureSessionSecret();
    expect(result).toBeTruthy();
    expect(result.length).toBe(64);
  });

  it("returns null from env file when key line is empty", async () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("APP_SESSION_SECRET=\nOTHER=val");

    const ensureSessionSecret = await freshImport();
    const result = ensureSessionSecret();
    expect(result).toBeTruthy();
    expect(result.length).toBe(64);
  });
});
