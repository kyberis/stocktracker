/**
 * One-time script to obtain a Gmail OAuth2 refresh token.
 *
 * Prerequisites:
 *   1. Create a Google Cloud project at https://console.cloud.google.com
 *   2. Enable the Gmail API (APIs & Services → Library → Gmail API)
 *   3. Create OAuth 2.0 credentials (Credentials → Create → OAuth client ID → Desktop app)
 *   4. Download the client ID and client secret
 *
 * Usage:
 *   GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=yyy npx tsx scripts/gmail-auth.ts
 *
 * The script opens a browser for consent, then prints the refresh token.
 * Store it as GMAIL_REFRESH_TOKEN in your Vercel env vars.
 */

import http from "node:http";
import { execSync } from "node:child_process";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const SCOPES = "https://www.googleapis.com/auth/gmail.modify";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET env vars before running.");
  process.exit(1);
}

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log("\nOpening browser for Google consent...\n");
try {
  execSync(`open "${authUrl}"`);
} catch {
  console.log("Open this URL in your browser:\n", authUrl);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end();
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400);
    res.end("Missing code parameter");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const data = await tokenRes.json();

    if (data.error) {
      console.error("\nToken exchange failed:", data);
      res.writeHead(500);
      res.end("Token exchange failed. Check terminal.");
    } else {
      console.log("\n=== SUCCESS ===\n");
      console.log("Refresh Token:", data.refresh_token);
      console.log("\nAdd these to your Vercel env vars:");
      console.log(`  GMAIL_CLIENT_ID=${CLIENT_ID}`);
      console.log(`  GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`  GMAIL_REFRESH_TOKEN=${data.refresh_token}`);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h2>Done! You can close this tab. Check the terminal for your refresh token.</h2>");
    }
  } catch (err) {
    console.error("\nError exchanging code:", err);
    res.writeHead(500);
    res.end("Error. Check terminal.");
  }

  setTimeout(() => process.exit(0), 1000);
});

server.listen(REDIRECT_PORT, () => {
  console.log(`Waiting for OAuth callback on http://localhost:${REDIRECT_PORT}/callback ...\n`);
});
