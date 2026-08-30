import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureClaraUser, fetchClaraReply } from "./clara-client";

const identity = { idpSub: "sub-1", email: "a@test.com", trefolioUserId: "u1" };

describe("ensureClaraUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns created user on JSON success", async () => {
    vi.stubEnv("CLARA_BASE_URL", "https://clara.trefolio.com");
    vi.stubEnv("IDP_SERVICE_TOKEN", "svc");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, created: true, id: "clara-1", idpSub: "sub-1" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(ensureClaraUser(identity, { name: "Ada" })).resolves.toEqual({
      ok: true,
      created: true,
      id: "clara-1",
      idpSub: "sub-1",
    });
  });

  it("maps HTML soft-404 (HTTP 200) to clara_route_missing", async () => {
    vi.stubEnv("CLARA_BASE_URL", "https://clara.trefolio.com");
    vi.stubEnv("IDP_SERVICE_TOKEN", "svc");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<!DOCTYPE html><html>Página no encontrada</html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );

    await expect(ensureClaraUser(identity)).resolves.toEqual({
      ok: false,
      error: "clara_route_missing",
      status: 502,
    });
  });

  it("surfaces Clara JSON error bodies", async () => {
    vi.stubEnv("CLARA_BASE_URL", "https://clara.trefolio.com");
    vi.stubEnv("IDP_SERVICE_TOKEN", "svc");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "email_conflict" }), {
          status: 409,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(ensureClaraUser(identity)).resolves.toEqual({
      ok: false,
      error: "email_conflict",
      status: 409,
    });
  });
});

describe("fetchClaraReply", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("maps 404 to proposeClara with login URL", async () => {
    vi.stubEnv("CLARA_BASE_URL", "https://clara.trefolio.com");
    vi.stubEnv("IDP_SERVICE_TOKEN", "svc");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            hasAccount: false,
            loginUrl: "https://clara.trefolio.com/login",
            note: "No Clara account",
          }),
          { status: 404 },
        ),
      ),
    );

    const result = await fetchClaraReply({ identity, message: "cuánto gasté" });
    expect(result).toEqual({
      available: false,
      proposeClara: true,
      loginUrl: "https://clara.trefolio.com/login",
      note: "No Clara account",
    });
  });

  it("returns a live Clara reply on 200", async () => {
    vi.stubEnv("CLARA_BASE_URL", "https://clara.trefolio.com");
    vi.stubEnv("IDP_SERVICE_TOKEN", "svc");
    vi.stubEnv("NODE_ENV", "test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ available: true, text: "Gastaste 200 EUR." }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchClaraReply({
      identity,
      message: "cuánto gasté",
      language: "es",
    });
    expect(result).toEqual({ available: true, text: "Gastaste 200 EUR.", note: undefined });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://clara.trefolio.com/api/internal/office/clara-chat",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.billingSource).toBe("trefolio");
    expect(body.message).toBe("cuánto gasté");
  });

  it("uses the development stub when Clara is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLARA_BASE_URL", "");
    vi.stubEnv("IDP_SERVICE_TOKEN", "");

    const result = await fetchClaraReply({ identity, message: "hi" });
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.note).toBe("Dev stub");
    }
  });
});
