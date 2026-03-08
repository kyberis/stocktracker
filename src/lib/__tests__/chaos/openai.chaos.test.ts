import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mockFetchResponse,
  mockFetchNetworkError,
  mockFetchTimeout,
} from "./_helpers";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

/**
 * Simulates the OpenAI call pattern used by all 4 routes:
 *   ai-analysis, import-portfolio, portfolio-review, device/ai-summary
 *
 * All routes call `fetch("https://api.openai.com/v1/chat/completions", ...)`
 * and handle the response the same way.
 */
async function simulateOpenAICall(): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-key",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "test" }],
    }),
  });

  if (!res.ok) {
    return { status: res.status, body: { error: `OpenAI error: ${res.status}` } };
  }

  const result = await res.json();
  const content = result.choices?.[0]?.message?.content;

  if (content === undefined || content === null) {
    return { status: 200, body: { error: "No content in response" } };
  }

  return { status: 200, body: { content } };
}

describe("OpenAI chaos", () => {
  describe("API error responses", () => {
    it("handles 500 internal server error", async () => {
      mockFetchResponse(500, { error: { message: "Internal server error" } });

      const result = await simulateOpenAICall();
      expect(result.status).toBe(500);
    });

    it("handles 429 rate limit", async () => {
      mockFetchResponse(429, {
        error: { message: "Rate limit exceeded", type: "rate_limit_error" },
      });

      const result = await simulateOpenAICall();
      expect(result.status).toBe(429);
    });

    it("handles 401 invalid API key", async () => {
      mockFetchResponse(401, {
        error: {
          message: "Incorrect API key provided",
          type: "invalid_request_error",
        },
      });

      const result = await simulateOpenAICall();
      expect(result.status).toBe(401);
    });

    it("handles 503 service unavailable", async () => {
      mockFetchResponse(503, {
        error: { message: "The server is overloaded" },
      });

      const result = await simulateOpenAICall();
      expect(result.status).toBe(503);
    });
  });

  describe("network failures", () => {
    it("throws on network error", async () => {
      mockFetchNetworkError("Failed to fetch");

      await expect(simulateOpenAICall()).rejects.toThrow("Failed to fetch");
    });

    it("never resolves on timeout", async () => {
      mockFetchTimeout();

      const race = Promise.race([
        simulateOpenAICall(),
        new Promise((resolve) => setTimeout(() => resolve("timed-out"), 50)),
      ]);

      expect(await race).toBe("timed-out");
    });
  });

  describe("malformed responses", () => {
    it("handles empty choices array", async () => {
      mockFetchResponse(200, { choices: [] });

      const result = await simulateOpenAICall();
      expect(result.body.error).toBe("No content in response");
    });

    it("handles missing choices field", async () => {
      mockFetchResponse(200, { id: "chatcmpl-xxx" });

      const result = await simulateOpenAICall();
      expect(result.body.error).toBe("No content in response");
    });

    it("handles null message content", async () => {
      mockFetchResponse(200, {
        choices: [{ message: { content: null } }],
      });

      const result = await simulateOpenAICall();
      expect(result.body.error).toBe("No content in response");
    });

    it("handles content that is not valid JSON (for structured routes)", async () => {
      mockFetchResponse(200, {
        choices: [{ message: { content: "This is not JSON at all" } }],
      });

      const result = await simulateOpenAICall();
      expect(result.status).toBe(200);
      expect(result.body.content).toBe("This is not JSON at all");

      expect(() => JSON.parse(result.body.content as string)).toThrow();
    });

    it("handles completely empty body", async () => {
      mockFetchResponse(200, {});

      const result = await simulateOpenAICall();
      expect(result.body.error).toBe("No content in response");
    });
  });

  describe("successful response", () => {
    it("extracts content from valid response", async () => {
      mockFetchResponse(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: "Portfolio is healthy" }),
            },
          },
        ],
      });

      const result = await simulateOpenAICall();
      expect(result.status).toBe(200);
      const parsed = JSON.parse(result.body.content as string);
      expect(parsed.summary).toBe("Portfolio is healthy");
    });
  });
});
