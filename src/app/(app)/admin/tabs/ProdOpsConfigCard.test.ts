/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProdOpsConfigCard from "./ProdOpsConfigCard";

describe("ProdOpsConfigCard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders initial settings and saves updated config", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        config: {
          enabled: true,
          baseUrl: "https://ops.trefolio.com",
          botUsername: "trefolio_prodops_bot",
          enabledEventTypes: ["user_registered", "membership_paid"],
          recipient: {
            id: "recipient_1",
            label: "@ops",
            type: "telegram_dm",
            source: "telegram_link",
            chatId: "12345",
            enabled: true,
            enabledEventTypes: ["user_registered"],
            telegramUserId: "777",
            telegramUsername: "ops",
            linkedAt: "2026-05-26T00:00:00.000Z",
          },
          pendingLink: null,
        },
        hasSharedSecret: true,
        maskedSharedSecret: "shar...cret",
        secretSource: "database",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      React.createElement(ProdOpsConfigCard, {
        initialData: {
          config: {
            enabled: true,
            baseUrl: "https://ops.trefolio.com",
            botUsername: "trefolio_prodops_bot",
            enabledEventTypes: ["user_registered"],
            recipient: {
              id: "recipient_1",
              label: "@ops",
              type: "telegram_dm",
              source: "telegram_link",
              chatId: "12345",
              enabled: true,
              enabledEventTypes: ["user_registered"],
              telegramUserId: "777",
              telegramUsername: "ops",
              linkedAt: "2026-05-26T00:00:00.000Z",
            },
            pendingLink: null,
          },
          hasSharedSecret: true,
          maskedSharedSecret: "shar...cret",
          secretSource: "database",
        },
      }),
    );

    fireEvent.change(screen.getByLabelText("ProdOps base URL"), {
      target: { value: "https://ops.trefolio.com/" },
    });
    fireEvent.change(screen.getByLabelText("Telegram bot username"), {
      target: { value: "@new_prodops_bot" },
    });
    fireEvent.change(screen.getByLabelText("Shared secret"), {
      target: { value: "new-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save ProdOps settings" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/prodops-config",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    expect(screen.getByText("ProdOps settings saved.")).toBeTruthy();
  });

  it("starts the Telegram link flow from admin", async () => {
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ok: true,
          deepLink: "https://t.me/trefolio_prodops_bot?start=test-token",
          expiresAt: "2999-05-26T00:15:00.000Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          config: {
            enabled: true,
            baseUrl: "https://ops.trefolio.com",
            botUsername: "trefolio_prodops_bot",
            enabledEventTypes: ["user_registered"],
            recipient: null,
            pendingLink: {
              tokenHash: "hash",
              tokenIssuedAt: "2999-05-26T00:00:00.000Z",
              tokenExpiresAt: "2999-05-26T00:15:00.000Z",
            },
          },
          hasSharedSecret: true,
          maskedSharedSecret: "shar...cret",
          secretSource: "database",
        }),
      }));

    render(
      React.createElement(ProdOpsConfigCard, {
        initialData: {
          config: {
            enabled: true,
            baseUrl: "https://ops.trefolio.com",
            botUsername: "trefolio_prodops_bot",
            enabledEventTypes: ["user_registered"],
            recipient: null,
            pendingLink: null,
          },
          hasSharedSecret: true,
          maskedSharedSecret: "shar...cret",
          secretSource: "database",
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Link Telegram recipient" }));

    await waitFor(() => {
      expect(openMock).toHaveBeenCalledWith(
        "https://t.me/trefolio_prodops_bot?start=test-token",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  it("disables the test button when config is incomplete", () => {
    render(
      React.createElement(ProdOpsConfigCard, {
        initialData: {
          config: {
            enabled: false,
            baseUrl: "",
            botUsername: "",
            enabledEventTypes: [],
            recipient: null,
            pendingLink: null,
          },
          hasSharedSecret: false,
          maskedSharedSecret: "",
          secretSource: "none",
        },
      }),
    );

    expect(
      (screen.getByRole("button", { name: "Send test notification" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
