import { describe, expect, it } from "vitest";

import {
  normalizeWarrenTextMessages,
  normalizeWarrenTextMessagesWithFinalUser,
} from "./normalize-chat-messages";

describe("normalizeWarrenTextMessages", () => {
  it("merges consecutive user messages (e.g. empty assistant omitted)", () => {
    expect(
      normalizeWarrenTextMessages([
        { role: "user", content: "Hello" },
        { role: "user", content: "Again" },
      ]),
    ).toEqual([{ role: "user", content: "Hello\n\nAgain" }]);
  });

  it("drops empty assistant rows then merges users", () => {
    expect(
      normalizeWarrenTextMessages([
        { role: "user", content: "Q1" },
        { role: "assistant", content: "" },
        { role: "user", content: "Q2" },
      ]),
    ).toEqual([{ role: "user", content: "Q1\n\nQ2" }]);
  });

  it("preserves alternating turns", () => {
    expect(
      normalizeWarrenTextMessages([
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hey" },
        { role: "user", content: "Bye" },
      ]),
    ).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hey" },
      { role: "user", content: "Bye" },
    ]);
  });

  it("trims whitespace-only rows", () => {
    expect(
      normalizeWarrenTextMessages([{ role: "user", content: "   " }]),
    ).toEqual([]);
  });
});

describe("normalizeWarrenTextMessagesWithFinalUser", () => {
  it("appends caption when prior ends with assistant", () => {
    expect(
      normalizeWarrenTextMessagesWithFinalUser(
        [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hey" },
        ],
        "More",
      ),
    ).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hey" },
      { role: "user", content: "More" },
    ]);
  });

  it("merges caption into prior user when chain left two users", () => {
    expect(
      normalizeWarrenTextMessagesWithFinalUser([{ role: "user", content: "Q1" }], "Q2"),
    ).toEqual([{ role: "user", content: "Q1\n\nQ2" }]);
  });
});
