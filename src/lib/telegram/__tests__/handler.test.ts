import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TelegramClient } from "../client";

// ─── Module mocks ─────────────────────────────────────────────────────────

const dbMocks = vi.hoisted(() => ({
  consumeLinkToken: vi.fn(),
  completeTelegramLink: vi.fn(),
  linkChat: vi.fn(),
  unlinkChat: vi.fn(),
  unlinkChatByUser: vi.fn(),
  getChatLinkByChatId: vi.fn(),
  getChatLinkByUserId: vi.fn(),
  touchChatLastSeen: vi.fn(),
  setChatActivePortfolio: vi.fn(),
  setChatLanguage: vi.fn(),
  savePendingProposal: vi.fn(),
  getPendingProposal: vi.fn(),
  updateProposalStatus: vi.fn(),
  appendChatMessage: vi.fn(),
  loadChatMessages: vi.fn(),
  findUserById: vi.fn(),
  getDefaultPortfolio: vi.fn(),
  getUserSettings: vi.fn(),
  isFeatureEnabled: vi.fn(),
  listAlerts: vi.fn(),
  listHoldings: vi.fn(),
  listPortfolios: vi.fn(),
}));

vi.mock("@/lib/db", () => dbMocks);

const guardsMock = vi.hoisted(() => ({
  requireFeatureQuotaByUserId: vi.fn(),
}));
vi.mock("@/lib/auth/guards", () => guardsMock);

const runTurnMock = vi.hoisted(() => ({ runWarrenTurn: vi.fn() }));
vi.mock("@/lib/ai/warren/run-turn", () => runTurnMock);

const snapMock = vi.hoisted(() => ({ buildPortfolioSnapshot: vi.fn() }));
vi.mock("@/lib/ai/warren/build-snapshot", () => snapMock);

const dispatchMock = vi.hoisted(() => ({ dispatchProposal: vi.fn() }));
vi.mock("@/lib/ai/warren/dispatch", () => dispatchMock);

const transcribeMock = vi.hoisted(() => ({ transcribeVoice: vi.fn() }));
vi.mock("@/lib/ai/transcribe", () => transcribeMock);

const ttsMock = vi.hoisted(() => ({ synthesizeSpeech: vi.fn() }));
vi.mock("@/lib/ai/tts", () => ttsMock);

// Stub the Bot API so we can capture sends.
function makeBotStub() {
  const sent: Array<{ method: string; chatId: string; text?: string; messageId?: number }> = [];
  const stub: TelegramClient = {
    sendMessage: vi.fn(async (chatId, text) => {
      sent.push({ method: "sendMessage", chatId: String(chatId), text });
      return { message_id: sent.length, chat: { id: Number(chatId) || 0 } };
    }),
    sendPhoto: vi.fn(async (chatId, _photoUrl, opts) => {
      sent.push({
        method: "sendPhoto",
        chatId: String(chatId),
        text: opts?.caption,
      });
      return { message_id: sent.length, chat: { id: Number(chatId) || 0 } };
    }),
    sendVoice: vi.fn(async (chatId) => {
      sent.push({ method: "sendVoice", chatId: String(chatId) });
      return { message_id: sent.length, chat: { id: Number(chatId) || 0 } };
    }),
    sendChatAction: vi.fn(async () => {}),
    editMessageText: vi.fn(async (chatId, messageId, text) => {
      sent.push({
        method: "editMessageText",
        chatId: String(chatId),
        text,
        messageId,
      });
    }),
    deleteMessage: vi.fn(async (chatId, messageId) => {
      sent.push({
        method: "deleteMessage",
        chatId: String(chatId),
        messageId,
      });
    }),
    answerCallbackQuery: vi.fn(async () => {}),
    setWebhook: vi.fn(async () => ({ ok: true })),
    deleteWebhook: vi.fn(async () => ({ ok: true })),
    setMyCommands: vi.fn(async () => ({ ok: true })),
    getMe: vi.fn(async () => ({ ok: true, result: { id: 1, username: "WarrenBot", first_name: "Warren" } })),
    getFile: vi.fn(async () => ({
      file_id: "fid",
      file_unique_id: "u",
      file_path: "voice/file_1.ogg",
    })),
    downloadFile: vi.fn(async () => ({
      buffer: Buffer.from("voice-bytes"),
      contentType: "audio/ogg",
    })),
  };
  return { stub, sent };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reasonable defaults:
  dbMocks.isFeatureEnabled.mockResolvedValue(true);
  dbMocks.touchChatLastSeen.mockResolvedValue(undefined);
  dbMocks.appendChatMessage.mockResolvedValue(undefined);
  dbMocks.loadChatMessages.mockResolvedValue([]);
  dbMocks.listPortfolios.mockResolvedValue([]);
  dbMocks.listHoldings.mockResolvedValue([]);
  dbMocks.listAlerts.mockResolvedValue([]);
  dbMocks.getChatLinkByChatId.mockResolvedValue(null);
  dbMocks.getUserSettings.mockResolvedValue({ language: "en" });
  guardsMock.requireFeatureQuotaByUserId.mockResolvedValue({ allowed: true, quota: {} });
  runTurnMock.runWarrenTurn.mockResolvedValue({
    text: "Test reply.",
    parts: [],
    proposals: [],
    totalTokens: 0,
    durationMs: 1,
  });
  transcribeMock.transcribeVoice.mockResolvedValue({
    ok: true,
    text: "How is my portfolio?",
    durationMs: 5,
    model: "whisper-1",
  });
  ttsMock.synthesizeSpeech.mockResolvedValue({
    ok: true,
    buffer: Buffer.from("ogg-bytes"),
    mime: "audio/ogg",
    durationMs: 10,
    model: "gpt-4o-mini-tts",
  });
  snapMock.buildPortfolioSnapshot.mockResolvedValue({
    baseCurrency: "EUR",
    totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
    holdingsCount: 1,
    topHoldings: [],
    allocation: [
      { type: "Stocks", pct: 80 },
      { type: "Cash", pct: 20 },
    ],
    cashSummary: {},
  });
});

async function loadHandler() {
  const handler = await import("../handler");
  const { setTestTelegramClient } = await import("../client");
  return { handler, setTestTelegramClient };
}

describe("telegram/handler · feature flag", () => {
  it("ignores updates when telegram_bot_enabled is off", async () => {
    dbMocks.isFeatureEnabled.mockResolvedValueOnce(false);
    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 9, type: "private" },
        date: 0,
        text: "hello",
        from: { id: 7 },
      },
    });

    expect(sent).toHaveLength(0);
    setTestTelegramClient(null);
  });
});

describe("telegram/handler · /start <token>", () => {
  it("consumes the link token, binds the chat, and greets the user", async () => {
    dbMocks.consumeLinkToken.mockResolvedValueOnce("user-1");
    dbMocks.findUserById.mockResolvedValueOnce({
      id: "user-1",
      username: "alice",
      display_name: "Alice",
    });
    dbMocks.linkChat.mockResolvedValueOnce(undefined);

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        text: "/start abc123",
        from: { id: 7, language_code: "en" },
      },
    });

    expect(dbMocks.consumeLinkToken).toHaveBeenCalledWith("abc123");
    expect(dbMocks.linkChat).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: "42", userId: "user-1" }),
    );
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const greeting = sent.find((m) => m.text?.includes("Linked"));
    expect(greeting).toBeDefined();
    setTestTelegramClient(null);
  });

  it("rejects an invalid/expired token without linking", async () => {
    dbMocks.consumeLinkToken.mockResolvedValueOnce(null);
    dbMocks.completeTelegramLink.mockResolvedValueOnce(null);
    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        text: "/start bad-token",
        from: { id: 7 },
      },
    });

    expect(dbMocks.linkChat).not.toHaveBeenCalled();
    expect(sent.some((m) => /invalid|expired/i.test(m.text || ""))).toBe(true);
    setTestTelegramClient(null);
  });

  it("falls back to the legacy notifications token when the new table misses", async () => {
    dbMocks.consumeLinkToken.mockResolvedValueOnce(null);
    dbMocks.completeTelegramLink.mockResolvedValueOnce({
      userId: "user-legacy",
      language: "es",
    });
    dbMocks.findUserById.mockResolvedValueOnce({
      id: "user-legacy",
      username: "carlos",
      display_name: "Carlos",
    });
    dbMocks.linkChat.mockResolvedValueOnce(undefined);

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 99, type: "private" },
        date: 0,
        text: "/start ab12cd34ef56ab12cd34ef56ab12cd34ef56",
        from: { id: 7, language_code: "es" },
      },
    });

    expect(dbMocks.completeTelegramLink).toHaveBeenCalledWith(
      "ab12cd34ef56ab12cd34ef56ab12cd34ef56",
      "99",
    );
    expect(dbMocks.linkChat).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: "99", userId: "user-legacy", languageCode: "es" }),
    );
    expect(sent.some((m) => /Vinculado/i.test(m.text || ""))).toBe(true);
    setTestTelegramClient(null);
  });
});

describe("telegram/handler · proposal callback", () => {
  it("Confirm dispatches the proposal and edits the message", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "",
    });
    dbMocks.getPendingProposal.mockResolvedValueOnce({
      id: "p1",
      chatId: "42",
      userId: "user-1",
      kind: "addHolding",
      dataJson: JSON.stringify({ ticker: "AAPL", shares: 5, purchasePrice: 180, displayCurrency: "USD" }),
      summary: "Add 5 × AAPL",
      createdAt: "",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      status: "pending",
    });
    dispatchMock.dispatchProposal.mockResolvedValueOnce({ ok: true, message: "Added 5 × AAPL." });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      callback_query: {
        id: "cb1",
        from: { id: 7, language_code: "en" },
        message: {
          message_id: 99,
          chat: { id: 42, type: "private" },
          date: 0,
        },
        data: "p:p1:y",
      },
    });

    expect(dispatchMock.dispatchProposal).toHaveBeenCalledWith("user-1", "addHolding", expect.objectContaining({ ticker: "AAPL" }));
    expect(dbMocks.updateProposalStatus).toHaveBeenCalledWith("p1", "confirmed");
    const edit = sent.find((m) => m.method === "editMessageText");
    expect(edit).toBeDefined();
    expect(edit?.messageId).toBe(99);
    setTestTelegramClient(null);
  });

  it("Cancel marks the proposal cancelled and does not dispatch", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "",
    });
    dbMocks.getPendingProposal.mockResolvedValueOnce({
      id: "p2",
      chatId: "42",
      userId: "user-1",
      kind: "addCash",
      dataJson: JSON.stringify({ name: "Test", amountEUR: 100 }),
      summary: "Add €100 cash",
      createdAt: "",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      status: "pending",
    });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      callback_query: {
        id: "cb2",
        from: { id: 7 },
        message: { message_id: 100, chat: { id: 42, type: "private" }, date: 0 },
        data: "p:p2:n",
      },
    });

    expect(dispatchMock.dispatchProposal).not.toHaveBeenCalled();
    expect(dbMocks.updateProposalStatus).toHaveBeenCalledWith("p2", "cancelled");
    setTestTelegramClient(null);
  });

  it("rejects a callback for a proposal owned by another user", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "",
    });
    dbMocks.getPendingProposal.mockResolvedValueOnce({
      id: "p3",
      chatId: "42",
      userId: "OTHER-USER",
      kind: "addHolding",
      dataJson: "{}",
      summary: "",
      createdAt: "",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      status: "pending",
    });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      callback_query: {
        id: "cb3",
        from: { id: 7 },
        message: { message_id: 101, chat: { id: 42, type: "private" }, date: 0 },
        data: "p:p3:y",
      },
    });

    expect(dispatchMock.dispatchProposal).not.toHaveBeenCalled();
    expect(dbMocks.updateProposalStatus).not.toHaveBeenCalled();
    setTestTelegramClient(null);
  });
});

describe("telegram/handler · free-form Warren turn", () => {
  it("appends user message, runs Warren, and sends the reply", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "",
    });
    dbMocks.listPortfolios.mockResolvedValueOnce([
      { id: "pf-1", name: "Default", currency: "EUR", isDefault: true },
    ]);
    snapMock.buildPortfolioSnapshot.mockResolvedValueOnce({
      baseCurrency: "EUR",
      totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
      holdingsCount: 0,
      topHoldings: [],
      allocation: [],
      cashSummary: {},
    });
    runTurnMock.runWarrenTurn.mockResolvedValueOnce({
      text: "Looks good.",
      parts: [],
      proposals: [],
      totalTokens: 100,
      durationMs: 5,
    });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        text: "How is my portfolio?",
        from: { id: 7 },
      },
    });

    expect(dbMocks.appendChatMessage).toHaveBeenCalledTimes(2);
    expect(runTurnMock.runWarrenTurn).toHaveBeenCalled();
    const reply = sent.find((m) => m.method === "sendMessage" && m.text?.includes("Looks good"));
    expect(reply).toBeDefined();
    setTestTelegramClient(null);
  });

  it("sends every Warren card part, not only the first", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "",
    });
    dbMocks.listPortfolios.mockResolvedValueOnce([
      { id: "pf-1", name: "Default", currency: "EUR", isDefault: true },
    ]);
    snapMock.buildPortfolioSnapshot.mockResolvedValueOnce({
      baseCurrency: "EUR",
      totals: { value: 1, cost: 1, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
      holdingsCount: 0,
      topHoldings: [],
      allocation: [],
      cashSummary: {},
    });
    runTurnMock.runWarrenTurn.mockResolvedValueOnce({
      text: "Here is your breakdown.",
      parts: [
        {
          kind: "summary",
          data: {
            holdingsCount: 3,
            currency: "EUR",
            totalValue: 1000,
            dayChange: 10,
            dayChangePct: 1,
            topHoldings: [{ ticker: "AAPL", pct: 40 }],
          },
        },
        {
          kind: "allocation",
          data: {
            items: [
              { label: "Stocks", pct: 80 },
              { label: "Cash", pct: 20 },
            ],
            currency: "EUR",
            totalValue: 1000,
          },
        },
      ],
      proposals: [],
      totalTokens: 100,
      durationMs: 5,
    });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        text: "Show allocation",
        from: { id: 7 },
      },
    });

    const cardTexts = sent.filter(
      (m) => m.method === "sendMessage" && m.text?.includes("Portfolio summary"),
    );
    const allocTexts = sent.filter(
      (m) => m.method === "sendMessage" && m.text?.includes("Allocation"),
    );
    expect(cardTexts.length).toBeGreaterThanOrEqual(1);
    expect(allocTexts.length).toBeGreaterThanOrEqual(1);
    setTestTelegramClient(null);
  });

  it("blocks free-form for an unlinked chat", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce(null);
    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 99, type: "private" },
        date: 0,
        text: "hello",
        from: { id: 7 },
      },
    });

    expect(runTurnMock.runWarrenTurn).not.toHaveBeenCalled();
    expect(sent.length).toBeGreaterThan(0);
    setTestTelegramClient(null);
  });

  it("converts AI Markdown (### headings, **bold**, bullets) instead of escaping it as literal text", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "",
    });
    dbMocks.listPortfolios.mockResolvedValueOnce([
      { id: "pf-1", name: "Default", currency: "EUR", isDefault: true },
    ]);
    runTurnMock.runWarrenTurn.mockResolvedValueOnce({
      text: "### Adobe Inc. (ADBE)\n- **Current Price:** $250.71",
      parts: [],
      proposals: [],
      totalTokens: 0,
      durationMs: 1,
    });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        text: "/news",
        from: { id: 7 },
      },
    });

    const aiReply = sent.find(
      (m) => m.method === "sendMessage" && m.text?.includes("Adobe"),
    );
    expect(aiReply).toBeDefined();
    // Heading converted to bold, no leftover ###
    expect(aiReply!.text).not.toContain("###");
    expect(aiReply!.text).toMatch(/\*Adobe Inc\\\. \\\(ADBE\\\)\*/);
    // Bold inline marker is single asterisk (MarkdownV2)
    expect(aiReply!.text).not.toMatch(/\*\*Current Price/);
    expect(aiReply!.text).toContain("• ");
    setTestTelegramClient(null);
  });

  it("renders chart parts via sendPhoto and falls back to text when the URL can't be built", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "",
    });
    dbMocks.listPortfolios.mockResolvedValueOnce([
      { id: "pf-1", name: "Default", currency: "EUR", isDefault: true },
    ]);
    runTurnMock.runWarrenTurn.mockResolvedValueOnce({
      text: "",
      parts: [
        {
          kind: "chart",
          data: {
            kind: "pie",
            title: "Allocation",
            currency: "EUR",
            slices: [
              { label: "Stocks", value: 80 },
              { label: "Cash", value: 20 },
            ],
          },
        },
      ],
      proposals: [],
      totalTokens: 0,
      durationMs: 1,
    });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        text: "Show my allocation chart",
        from: { id: 7 },
      },
    });

    const photo = sent.find((m) => m.method === "sendPhoto");
    expect(photo).toBeDefined();
    setTestTelegramClient(null);
  });
});

describe("telegram/handler · /chart command", () => {
  it("sends a portfolio allocation pie chart photo", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "pf-1",
    });
    dbMocks.listPortfolios.mockResolvedValueOnce([
      { id: "pf-1", name: "Default", currency: "EUR", isDefault: true },
    ]);

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        text: "/chart",
        from: { id: 7 },
      },
    });

    const photo = sent.find((m) => m.method === "sendPhoto");
    expect(photo).toBeDefined();
    expect(runTurnMock.runWarrenTurn).not.toHaveBeenCalled();
    setTestTelegramClient(null);
  });

  it("sends a fallback text when the snapshot has no allocation", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "pf-1",
    });
    dbMocks.listPortfolios.mockResolvedValueOnce([
      { id: "pf-1", name: "Default", currency: "EUR", isDefault: true },
    ]);
    snapMock.buildPortfolioSnapshot.mockResolvedValueOnce({
      baseCurrency: "EUR",
      totals: { value: 0, cost: 0, gainLoss: 0, gainLossPct: 0, dayChange: 0 },
      holdingsCount: 0,
      topHoldings: [],
      allocation: [],
      cashSummary: {},
    });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        text: "/chart",
        from: { id: 7 },
      },
    });

    expect(sent.some((m) => m.method === "sendPhoto")).toBe(false);
    expect(
      sent.some((m) => m.method === "sendMessage" && /chart|gráfico/i.test(m.text || "")),
    ).toBe(true);
    setTestTelegramClient(null);
  });
});

describe("telegram/handler · free-form Warren turn quota", () => {
  it("returns the quota message when the user is over quota", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce({
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "",
    });
    guardsMock.requireFeatureQuotaByUserId.mockResolvedValueOnce({
      allowed: false,
      reason: "quota_exceeded",
    });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        text: "How is my portfolio?",
        from: { id: 7 },
      },
    });

    expect(runTurnMock.runWarrenTurn).not.toHaveBeenCalled();
    expect(sent.some((m) => /limit|monthly|reach/i.test(m.text || ""))).toBe(true);
    setTestTelegramClient(null);
  });
});

describe("telegram/handler · voice messages", () => {
  function linkedChat() {
    return {
      chatId: "42",
      userId: "user-1",
      languageCode: "en",
      linkedAt: "",
      lastSeenAt: "",
      lastActivePortfolioId: "",
    };
  }

  it("transcribes the voice note, runs Warren, echoes the transcript and sends a TTS reply", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce(linkedChat());
    dbMocks.listPortfolios.mockResolvedValueOnce([
      { id: "pf-1", name: "Default", currency: "EUR", isDefault: true },
    ]);
    runTurnMock.runWarrenTurn.mockResolvedValueOnce({
      text: "Looks healthy. Your portfolio is up 3% today.",
      parts: [],
      proposals: [],
      totalTokens: 100,
      durationMs: 5,
    });

    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        from: { id: 7 },
        voice: {
          file_id: "fid",
          duration: 8,
          mime_type: "audio/ogg",
          file_size: 12_345,
        },
      },
    });

    expect(stub.getFile).toHaveBeenCalledWith("fid");
    expect(stub.downloadFile).toHaveBeenCalledWith("voice/file_1.ogg");
    expect(transcribeMock.transcribeVoice).toHaveBeenCalled();
    expect(runTurnMock.runWarrenTurn).toHaveBeenCalled();
    // Echoes the transcript back so the user can spot misrecognitions
    const echo = sent.find((m) => m.method === "sendMessage" && /How is my portfolio/i.test(m.text || ""));
    expect(echo).toBeDefined();
    // Synthesizes and sends a voice reply too
    expect(ttsMock.synthesizeSpeech).toHaveBeenCalled();
    expect(sent.some((m) => m.method === "sendVoice")).toBe(true);
    setTestTelegramClient(null);
  });

  it("rejects voice notes longer than the duration cap without calling Whisper", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce(linkedChat());
    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        from: { id: 7 },
        voice: {
          file_id: "fid",
          duration: 120,
          mime_type: "audio/ogg",
          file_size: 100_000,
        },
      },
    });

    expect(transcribeMock.transcribeVoice).not.toHaveBeenCalled();
    expect(runTurnMock.runWarrenTurn).not.toHaveBeenCalled();
    expect(sent.some((m) => /60 seconds|seconds/i.test(m.text || ""))).toBe(true);
    setTestTelegramClient(null);
  });

  it("rejects oversize voice notes without calling Whisper", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce(linkedChat());
    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        from: { id: 7 },
        voice: {
          file_id: "fid",
          duration: 30,
          mime_type: "audio/ogg",
          file_size: 50 * 1024 * 1024,
        },
      },
    });

    expect(transcribeMock.transcribeVoice).not.toHaveBeenCalled();
    expect(runTurnMock.runWarrenTurn).not.toHaveBeenCalled();
    expect(sent.some((m) => /too large|MB/i.test(m.text || ""))).toBe(true);
    setTestTelegramClient(null);
  });

  it("surfaces a localized error when Whisper fails", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce(linkedChat());
    transcribeMock.transcribeVoice.mockResolvedValueOnce({
      ok: false,
      reason: "request_failed",
      durationMs: 1,
    });
    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 42, type: "private" },
        date: 0,
        from: { id: 7 },
        voice: {
          file_id: "fid",
          duration: 8,
          mime_type: "audio/ogg",
          file_size: 12_345,
        },
      },
    });

    expect(runTurnMock.runWarrenTurn).not.toHaveBeenCalled();
    expect(sent.some((m) => /understand|audio/i.test(m.text || ""))).toBe(true);
    setTestTelegramClient(null);
  });

  it("ignores voice notes from unlinked chats with the not-linked copy", async () => {
    dbMocks.getChatLinkByChatId.mockResolvedValueOnce(null);
    const { handler, setTestTelegramClient } = await loadHandler();
    const { stub, sent } = makeBotStub();
    setTestTelegramClient(stub);

    await handler.handleTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 99, type: "private" },
        date: 0,
        from: { id: 7 },
        voice: {
          file_id: "fid",
          duration: 8,
        },
      },
    });

    expect(transcribeMock.transcribeVoice).not.toHaveBeenCalled();
    expect(runTurnMock.runWarrenTurn).not.toHaveBeenCalled();
    expect(sent.some((m) => /not linked|trefolio/i.test(m.text || ""))).toBe(true);
    setTestTelegramClient(null);
  });
});
