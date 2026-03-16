import { createHmac, randomBytes } from "crypto";
import { getPlatformSetting } from "@/lib/db";
import { tryDecryptOrPlaintext } from "@/lib/crypto";

interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

const SETTING_KEYS = {
  apiKey: "x_api_key",
  apiSecret: "x_api_secret",
  accessToken: "x_access_token",
  accessTokenSecret: "x_access_token_secret",
} as const;

export async function getXCredentials(): Promise<XCredentials | null> {
  const [apiKey, apiSecret, accessToken, accessTokenSecret] = await Promise.all([
    getPlatformSetting(SETTING_KEYS.apiKey).then(tryDecryptOrPlaintext),
    getPlatformSetting(SETTING_KEYS.apiSecret).then(tryDecryptOrPlaintext),
    getPlatformSetting(SETTING_KEYS.accessToken).then(tryDecryptOrPlaintext),
    getPlatformSetting(SETTING_KEYS.accessTokenSecret).then(tryDecryptOrPlaintext),
  ]);

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) return null;
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

export async function hasXCredentials(): Promise<boolean> {
  const creds = await getXCredentials();
  return creds !== null;
}

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  creds: XCredentials,
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`).join("&");
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessTokenSecret)}`;
  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}

function buildOAuthHeader(creds: XCredentials, method: string, url: string): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(method, url, oauthParams, creds);
  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

export interface PostTweetResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

export async function postTweet(text: string): Promise<PostTweetResult> {
  const creds = await getXCredentials();
  if (!creds) return { success: false, error: "X API credentials not configured" };

  const url = "https://api.x.com/2/tweets";
  const authHeader = buildOAuthHeader(creds, "POST", url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[x-client] Tweet failed:", res.status, body);
      return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    return { success: true, tweetId: data.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[x-client] Tweet error:", msg);
    return { success: false, error: msg };
  }
}
