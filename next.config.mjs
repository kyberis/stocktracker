import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/* ─── Stamp sw.js with a unique build ID so the browser detects new deploys ─── */
const __dirname = dirname(fileURLToPath(import.meta.url));
const swPath = join(__dirname, "public", "sw.js");
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || Date.now().toString(36);
try {
  const sw = readFileSync(swPath, "utf8");
  if (sw.includes("__BUILD_ID__")) {
    writeFileSync(swPath, sw.replace(/__BUILD_ID__/g, buildId));
  }
} catch {
  // sw.js missing — skip (e.g. during tests)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self'",
              "connect-src 'self' https://challenges.cloudflare.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://vercel.live",
              "frame-src https://challenges.cloudflare.com https://vercel.live",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
