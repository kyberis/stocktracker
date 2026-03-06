import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ok, err, parseBody } from "./api-response";

const testSchema = z.object({
  name: z.string(),
  age: z.number(),
});

describe("ok", () => {
  it("returns Response with status 200 and correct JSON body", async () => {
    const data = { foo: "bar", count: 42 };
    const res = ok(data);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(data);
  });

  it("sets content-type to application/json", () => {
    const res = ok({ test: true });
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("respects custom status", () => {
    const res = ok({ id: "new-123" }, { status: 201 });
    expect(res.status).toBe(201);
  });

  it("passes through other ResponseInit options", () => {
    const res = ok({ created: true }, { status: 201, headers: { "X-Custom": "value" } });
    expect(res.status).toBe(201);
    expect(res.headers.get("X-Custom")).toBe("value");
  });
});

describe("err", () => {
  it("returns Response with correct error JSON and status", async () => {
    const res = err("Something went wrong", 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Something went wrong" });
  });

  it("sets content-type to application/json", () => {
    const res = err("Error", 500);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("accepts different status codes", () => {
    expect(err("Bad request", 400).status).toBe(400);
    expect(err("Unauthorized", 401).status).toBe(401);
    expect(err("Not found", 404).status).toBe(404);
    expect(err("Server error", 500).status).toBe(500);
  });
});

describe("parseBody", () => {
  it("parses valid body with schema and returns success", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "Alice", age: 30 }),
      headers: { "Content-Type": "application/json" },
    });
    const result = await parseBody(req, testSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", age: 30 });
    }
  });

  it("returns error response for invalid body (schema validation fails)", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "Bob", age: "thirty" }),
      headers: { "Content-Type": "application/json" },
    });
    const result = await parseBody(req, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Response);
      expect(result.error.status).toBe(400);
      const body = await result.error.json();
      expect(body).toHaveProperty("error");
    }
  });

  it("returns error response for missing required fields", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "Charlie" }),
      headers: { "Content-Type": "application/json" },
    });
    const result = await parseBody(req, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.status).toBe(400);
    }
  });

  it("returns error response for non-JSON body", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: "not valid json",
      headers: { "Content-Type": "text/plain" },
    });
    const result = await parseBody(req, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Response);
      expect(result.error.status).toBe(400);
      const body = await result.error.json();
      expect(body.error).toBe("Invalid request body");
    }
  });

  it("returns error response for empty body", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: "",
      headers: { "Content-Type": "application/json" },
    });
    const result = await parseBody(req, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.status).toBe(400);
    }
  });

  it("returns error response for null body", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: "null",
      headers: { "Content-Type": "application/json" },
    });
    const result = await parseBody(req, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.status).toBe(400);
    }
  });
});
