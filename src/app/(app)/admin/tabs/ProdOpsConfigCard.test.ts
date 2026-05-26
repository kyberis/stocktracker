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
          enabledEventTypes: ["user_registered", "membership_paid"],
          destinations: [{
            id: "dest_1",
            label: "Ops Team",
            chatId: "-1001",
            enabled: true,
            enabledEventTypes: ["user_registered"],
          }],
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
            enabledEventTypes: ["user_registered"],
            destinations: [{
              id: "dest_1",
              label: "Ops Team",
              chatId: "-1001",
              enabled: true,
              enabledEventTypes: ["user_registered"],
            }],
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

  it("disables the test button when config is incomplete", () => {
    render(
      React.createElement(ProdOpsConfigCard, {
        initialData: {
          config: {
            enabled: false,
            baseUrl: "",
            enabledEventTypes: [],
            destinations: [],
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
