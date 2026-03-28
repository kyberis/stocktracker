/**
 * Lightweight Gmail API client using OAuth2 refresh tokens.
 * No SDK dependency — uses fetch() to call the REST API directly.
 */

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function getCredentials() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const creds = getCredentials();
  if (!creds) throw new Error("Gmail credentials not configured");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail token refresh failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

async function gmailFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${GMAIL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  return res;
}

export function isGmailConfigured(): boolean {
  return getCredentials() !== null;
}

export interface GmailMessageRef {
  id: string;
  threadId: string;
}

export async function listUnreadByQuery(query: string): Promise<GmailMessageRef[]> {
  const q = encodeURIComponent(query);
  const res = await gmailFetch(`/messages?q=${q}&maxResults=10`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail list failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return (data.messages as GmailMessageRef[]) ?? [];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  textBody: string;
  htmlBody: string;
}

export async function getMessageContent(messageId: string): Promise<GmailMessage> {
  const res = await gmailFetch(`/messages/${messageId}?format=full`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail get message failed (${res.status}): ${text}`);
  }
  const data = await res.json();

  const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  let textBody = "";
  let htmlBody = "";

  function extractParts(part: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      textBody += decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      htmlBody += decodeBase64Url(part.body.data);
    }
    if (Array.isArray(part.parts)) {
      for (const sub of part.parts) extractParts(sub as typeof part);
    }
  }

  extractParts(data.payload ?? {});

  return {
    id: data.id,
    threadId: data.threadId,
    subject: getHeader("Subject"),
    from: getHeader("From"),
    date: getHeader("Date"),
    textBody,
    htmlBody,
  };
}

export async function markAsRead(messageId: string): Promise<void> {
  const res = await gmailFetch(`/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail markAsRead failed (${res.status}): ${text}`);
  }
}

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}
