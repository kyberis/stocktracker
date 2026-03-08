import { vi } from "vitest";

/**
 * Stub global fetch to return a fixed response.
 * Restoring the original is the caller's responsibility (use afterEach).
 */
export function mockFetchResponse(
  status: number,
  body: unknown,
): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

/**
 * Stub global fetch to return a plain-text (XML) response.
 */
export function mockFetchText(
  status: number,
  text: string,
): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValue(
    new Response(text, {
      status,
      headers: { "Content-Type": "text/plain" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

/**
 * Stub global fetch so it never resolves (simulates infinite hang).
 */
export function mockFetchTimeout(): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockReturnValue(new Promise(() => {}));
  vi.stubGlobal("fetch", fn);
  return fn;
}

/**
 * Stub global fetch to reject with a network-level error.
 */
export function mockFetchNetworkError(
  message = "Failed to fetch",
): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockRejectedValue(new TypeError(message));
  vi.stubGlobal("fetch", fn);
  return fn;
}

/**
 * Stub global fetch to return a sequence of responses (one per call).
 * After all responses are consumed, subsequent calls reject.
 */
export function mockFetchSequence(
  responses: Array<{ status: number; body?: unknown; text?: string }>,
): ReturnType<typeof vi.fn> {
  let idx = 0;
  const fn = vi.fn().mockImplementation(() => {
    if (idx >= responses.length) {
      return Promise.reject(new Error("mockFetchSequence: exhausted"));
    }
    const r = responses[idx++];
    if (r.text !== undefined) {
      return Promise.resolve(
        new Response(r.text, {
          status: r.status,
          headers: { "Content-Type": "text/plain" },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(r.body ?? {}), {
        status: r.status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
