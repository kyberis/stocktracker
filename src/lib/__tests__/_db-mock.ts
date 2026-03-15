import { vi } from "vitest";

export function createMockClient() {
  return {
    execute: vi.fn().mockResolvedValue({ rows: [], columns: [] }),
    batch: vi.fn().mockResolvedValue([]),
    executeMultiple: vi.fn().mockResolvedValue(undefined),
  };
}

let _mockClient: ReturnType<typeof createMockClient> | null = null;

export function getMockClient() {
  if (!_mockClient) _mockClient = createMockClient();
  return _mockClient;
}

export function resetMockClient() {
  _mockClient = null;
}

export function setupDbMock() {
  const client = getMockClient();
  vi.mock("@/lib/db/client", () => ({
    ensureInitialized: vi.fn().mockResolvedValue(client),
  }));
  return client;
}
