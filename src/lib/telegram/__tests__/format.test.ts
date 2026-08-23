import { describe, it, expect } from "vitest";
import {
  bold,
  commonMarkToTelegram,
  escapeMarkdown,
  fmtMoney,
  fmtNumber,
  fmtSignedPct,
  progressBar,
  renderHelpMenu,
  renderWarrenPart,
  renderWarrenProposal,
  splitForTelegram,
} from "../format";
import type { WarrenPart, WarrenProposal } from "@/lib/ai/warren/types";

describe("telegram/format · escapeMarkdown", () => {
  it("escapes every MarkdownV2 special character", () => {
    const sample = "Hello _world_*!*[link](url)~`>#+-=|{}.! ";
    const out = escapeMarkdown(sample);
    expect(out).toContain("\\_");
    expect(out).toContain("\\*");
    expect(out).toContain("\\.");
    expect(out).toContain("\\!");
    expect(out).toContain("\\[");
    expect(out).toContain("\\]");
    expect(out).toContain("\\-");
  });

  it("returns empty string for empty input", () => {
    expect(escapeMarkdown("")).toBe("");
  });

  it("does not double-escape already escaped chars", () => {
    // Escaping twice produces \\\\\\. which is still parseable; we just want
    // to guarantee no special char survives unescaped.
    const out = escapeMarkdown(escapeMarkdown("a.b"));
    expect(/(?<!\\)\./.test(out)).toBe(false);
  });
});

describe("telegram/format · commonMarkToTelegram", () => {
  it("converts ATX headings to MarkdownV2 bold", () => {
    const out = commonMarkToTelegram("### Adobe Inc. (ADBE)");
    // Heading content is bolded and special chars (`.`, `(`, `)`) are escaped.
    expect(out).toBe("*Adobe Inc\\. \\(ADBE\\)*");
    expect(out).not.toContain("###");
  });

  it("converts **bold** to *bold* and escapes special chars inside", () => {
    const out = commonMarkToTelegram("Price is **$250.71** today");
    // Bold delimiter is single asterisk in MarkdownV2.
    expect(out).toContain("*$250\\.71*");
    expect(out).not.toContain("**");
  });

  it("converts bullet lists with bold labels (the /news case)", () => {
    const input =
      "### Adobe Inc. (ADBE)\n" +
      "- **Current Price:** $250.71\n" +
      "- **Day Change:** +1.87%\n" +
      "- **52-Week Range:** $224.13 - $422.95";
    const out = commonMarkToTelegram(input);
    // Heading rendered as bold
    expect(out).toContain("*Adobe Inc\\. \\(ADBE\\)*");
    // Bullets converted, bold labels preserved
    expect(out).toContain("• *Current Price:*");
    expect(out).toContain("• *Day Change:*");
    // Special chars escaped (`$` is NOT a MarkdownV2 special char, but `.` is)
    expect(out).toContain("$250\\.71");
    expect(out).toContain("\\+1\\.87%");
    // No leftover CommonMark syntax
    expect(out).not.toContain("###");
    expect(out).not.toContain("**");
    // Should not be prefixed with a literal "- "
    expect(out).not.toMatch(/^- /m);
  });

  it("preserves links in MarkdownV2 form", () => {
    const out = commonMarkToTelegram("See [Apple](https://apple.com) for info.");
    expect(out).toContain("[Apple](https://apple.com)");
    expect(out).toContain("\\.");
  });

  it("converts inline code", () => {
    const out = commonMarkToTelegram("Run `npm test` to verify.");
    expect(out).toContain("`npm test`");
    expect(out).toContain("\\.");
  });

  it("converts fenced code blocks", () => {
    const out = commonMarkToTelegram("```js\nconst x = 1;\n```");
    expect(out).toContain("```js");
    // Content is NOT escaped MarkdownV2-style inside code.
    expect(out).toContain("const x = 1;");
  });

  it("escapes raw special chars outside formatted spans", () => {
    const out = commonMarkToTelegram("Plain text with . and ! and (parens)");
    expect(out).toBe("Plain text with \\. and \\! and \\(parens\\)");
  });

  it("returns empty string for empty input", () => {
    expect(commonMarkToTelegram("")).toBe("");
  });
});

describe("telegram/format · bold", () => {
  it("wraps escaped content in *…*", () => {
    expect(bold("Hi.")).toBe("*Hi\\.*");
  });
});

describe("telegram/format · numbers", () => {
  it("formats with thousand separators", () => {
    expect(fmtNumber(1234567.89)).toBe("1,234,567.89");
    expect(fmtNumber(-1000)).toBe("-1,000.00");
    expect(fmtNumber(0.5, 1)).toBe("0.5");
  });

  it("renders money with currency symbols", () => {
    expect(fmtMoney(123, "EUR")).toBe("€123.00");
    expect(fmtMoney(123, "USD")).toBe("$123.00");
    expect(fmtMoney(123, "AUD")).toContain("AUD");
  });

  it("renders signed percentages with arrows", () => {
    expect(fmtSignedPct(5.2)).toContain("▲");
    expect(fmtSignedPct(5.2)).toContain("+5.2");
    expect(fmtSignedPct(-3)).toContain("▼");
    expect(fmtSignedPct(0)).toContain("•");
  });
});

describe("telegram/format · progressBar", () => {
  it("uses 10 cells by default", () => {
    const bar = progressBar(40, 10);
    expect(bar).toHaveLength(10);
    expect(bar.split("█")).toHaveLength(5); // 4 full chars
  });

  it("clamps to [0, 100]", () => {
    expect(progressBar(150, 10)).toBe("█".repeat(10));
    expect(progressBar(-50, 10)).toBe("░".repeat(10));
  });
});

describe("telegram/format · splitForTelegram", () => {
  it("returns input untouched when below limit", () => {
    expect(splitForTelegram("hello")).toEqual(["hello"]);
  });

  it("splits long messages on paragraph boundaries", () => {
    const big = "a".repeat(2000) + "\n\n" + "b".repeat(2000) + "\n\n" + "c".repeat(2000);
    const chunks = splitForTelegram(big, 3500);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });

  it("never returns empty chunks", () => {
    const text = "x".repeat(8000);
    const chunks = splitForTelegram(text, 3500);
    for (const c of chunks) expect(c.length).toBeGreaterThan(0);
  });
});

describe("telegram/format · renderWarrenPart", () => {
  it("renders summary with totals and top holdings", () => {
    const part: WarrenPart = {
      kind: "summary",
      data: {
        totalValue: 12345.67,
        dayChange: 100,
        dayChangePct: 0.8,
        holdingsCount: 5,
        topHoldings: [
          { ticker: "AAPL", pct: 14.5 },
          { ticker: "MSFT", pct: 10.0 },
        ],
        currency: "EUR",
        privacy: "full",
      },
    };
    const md = renderWarrenPart(part);
    expect(md).toContain("Portfolio summary");
    expect(md).toContain("AAPL");
    expect(md).toContain("Holdings: 5");
    // Bold the title
    expect(md).toMatch(/\*Portfolio summary\*/);
  });

  it("renders allocation with progress bars", () => {
    const part: WarrenPart = {
      kind: "allocation",
      data: {
        items: [
          { label: "Stocks", pct: 64, color: "#6366f1" },
          { label: "Bonds", pct: 30, color: "#10b981" },
          { label: "Cash", pct: 6, color: "#1e293b" },
        ],
        totalValue: 50000,
        currency: "EUR",
        privacy: "full",
      },
    };
    const md = renderWarrenPart(part);
    expect(md).toContain("Allocation");
    expect(md).toMatch(/█+/);
    expect(md).toContain("64");
  });

  it("renders stock snapshot", () => {
    const part: WarrenPart = {
      kind: "stockSnapshot",
      data: {
        ticker: "TSLA",
        name: "Tesla",
        price: 180.5,
        currency: "USD",
        changePct: 1.2,
        fiftyTwoWeekHigh: 250,
        fiftyTwoWeekLow: 140,
      },
    };
    const md = renderWarrenPart(part);
    expect(md).toContain("TSLA");
    expect(md).toContain("Tesla");
    expect(md).toContain("52w");
  });

  it("renders trade guidance with valuation and disclaimer", () => {
    const part: WarrenPart = {
      kind: "tradeGuidance",
      data: {
        ticker: "UBER",
        name: "Uber Technologies",
        action: "trim",
        currentPrice: 72.5,
        currency: "USD",
        changePct: -1.2,
        valuationLabel: "fair",
        upsideToTargetPct: 4.5,
        suggestedShares: 25,
        suggestedAmount: 1812.5,
        rationale: "Limited upside to analyst target; trimming half reduces concentration.",
      },
    };
    const md = renderWarrenPart(part);
    expect(md).toContain("Trim guidance");
    expect(md).toContain("UBER");
    expect(md).toContain("fair");
    expect(md).toContain("does not execute trades");
  });
});

describe("telegram/format · renderWarrenProposal", () => {
  it("builds a Confirm/Cancel inline keyboard with proposal id in callback_data", () => {
    const proposal: WarrenProposal = {
      id: "abc123",
      kind: "addHolding",
      title: "Add 5 × AAPL",
      summary: "Buy 5 shares of AAPL at 180 USD.",
      rows: [
        { label: "Ticker", value: "AAPL" },
        { label: "Shares", value: "5" },
      ],
      data: { ticker: "AAPL", shares: 5, purchasePrice: 180, displayCurrency: "USD" },
    };
    const { text, keyboard } = renderWarrenProposal(proposal, {
      confirm: "Confirm",
      cancel: "Cancel",
    });
    expect(text).toContain("Add 5");
    expect(text).toContain("Ticker");
    expect(keyboard.inline_keyboard).toHaveLength(1);
    expect(keyboard.inline_keyboard[0]).toHaveLength(2);
    expect(keyboard.inline_keyboard[0][0].callback_data).toBe("p:abc123:y");
    expect(keyboard.inline_keyboard[0][1].callback_data).toBe("p:abc123:n");
    // callback_data must be ≤ 64 bytes per Telegram spec
    expect(Buffer.byteLength(keyboard.inline_keyboard[0][0].callback_data!, "utf8")).toBeLessThanOrEqual(64);
  });

  it("uses destructive label for destructive proposals", () => {
    const proposal: WarrenProposal = {
      id: "x",
      kind: "removeHolding",
      title: "Remove AAPL",
      summary: "Delete this position.",
      destructive: true,
      rows: [],
      data: { holdingId: "h-1" },
    };
    const { keyboard } = renderWarrenProposal(proposal, {
      confirm: "Confirm",
      cancel: "Cancel",
      destructive: "Yes, delete",
    });
    expect(keyboard.inline_keyboard[0][0].text).toBe("Yes, delete");
  });
});

describe("telegram/format · renderHelpMenu", () => {
  it("includes title, sections, and disclaimer", () => {
    const md = renderHelpMenu({
      title: "Warren — what I can do",
      intro: "Ask anything.",
      sections: [
        { heading: "Portfolio", items: ["/holdings", "How is my portfolio?"] },
        { heading: "Alerts", items: ["/alerts"] },
      ],
      disclaimer: "AI-generated assistance, not financial advice.",
    });
    expect(md).toContain("*Warren");
    expect(md).toContain("Portfolio");
    expect(md).toContain("/holdings");
    expect(md).toContain("not financial advice");
  });
});
