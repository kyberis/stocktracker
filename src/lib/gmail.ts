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
    cachedToken = null;
    throw new Error(
      `Gmail token refresh failed (${res.status}): ${text}. ` +
        `If the refresh token expired, re-run: npx tsx scripts/gmail-auth.ts`,
    );
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

  if (res.status === 401 && cachedToken) {
    cachedToken = null;
    const freshToken = await getAccessToken();
    return fetch(`${GMAIL_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${freshToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  }

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

/* ── Forwarded email helpers ── */

/**
 * Extract the original send date from a forwarded email.
 * Gmail forwards include a block like:
 *   ---------- Forwarded message ---------
 *   From: ...
 *   Date: Wed, Apr 2, 2026 at 10:30 AM
 *   Subject: ...
 *
 * Falls back to the forwarding email's own Date header.
 * Returns YYYY-MM-DD.
 */
export function parseForwardedDate(email: GmailMessage): string {
  const body = email.textBody || email.htmlBody;

  const fwdPattern =
    /[-–—]{3,}\s*Forwarded message\s*[-–—]{3,}[\s\S]*?Date:\s*(.+)/i;
  const match = body.match(fwdPattern);

  if (match?.[1]) {
    const parsed = new Date(match[1].trim());
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  if (email.date) {
    const parsed = new Date(email.date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Extract the original sender from a forwarded email.
 * Parses the "From:" line inside the forwarded-message block.
 * Falls back to the forwarding email's From header.
 */
export function parseForwardedSender(email: GmailMessage): string {
  const body = email.textBody || email.htmlBody;

  const fwdPattern =
    /[-–—]{3,}\s*Forwarded message\s*[-–—]{3,}[\s\S]*?From:\s*(.+)/i;
  const match = body.match(fwdPattern);

  if (match?.[1]) {
    return match[1].trim().replace(/<[^>]+>/g, "").trim();
  }

  return email.from;
}

const NOISE_PATTERNS = [
  /unsubscribe/i,
  /mailto:/i,
  /manage.preferences/i,
  /email.preferences/i,
  /list-manage/i,
  /twitter\.com/i,
  /x\.com/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /linkedin\.com/i,
  /youtube\.com/i,
  /t\.co\//i,
  /click\./i,
  /tracking\./i,
  /beacon\./i,
  /pixel\./i,
  /open\./i,
];

/**
 * Extract meaningful links from HTML email content.
 * Filters out unsubscribe, social media, and tracking links.
 */
export function extractLinksFromHtml(html: string): { url: string; text: string }[] {
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  const links: { url: string; text: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = linkRegex.exec(html)) !== null) {
    const url = m[1].trim();
    const rawText = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    if (!url || url.startsWith("#") || url.startsWith("mailto:")) continue;
    if (NOISE_PATTERNS.some((p) => p.test(url))) continue;
    if (seen.has(url)) continue;
    if (!rawText || rawText.length < 3) continue;

    seen.add(url);
    links.push({ url, text: rawText });
  }

  return links;
}
