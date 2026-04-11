import { readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
const reactPkgDir = dirname(require.resolve("react/package.json"));
const reactDomPkgDir = dirname(require.resolve("react-dom/package.json"));

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
  // Avoid duplicate React / wrong react-dom server bundle (ReactCurrentDispatcher undefined on Vercel).
  // Alias package roots (not react/index.js) so `react/jsx-runtime` still resolves.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: reactPkgDir,
      "react-dom": reactDomPkgDir,
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    serverComponentsExternalPackages: ["@libsql/client"],
    outputFileTracingIncludes: {
      "/api/admin/docs": [
        "./docs/**/*.html",
        "./public/**/*.html",
        "./lilygo-t4s3/**/*.html",
      ],
    },
  },
  async headers() {
    /* CSP roadmap (security): Next.js 15+ middleware or App Router headers() can attach
       per-request nonces — replace 'unsafe-inline'/'unsafe-eval' in script-src incrementally.
       Order of work: (1) inventory inline scripts, (2) move to external files or nonces,
       (3) tighten connect-src/frame-src as third-party domains change.
       See docs/SECURITY_AUDIT.md */
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel.live https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com https://www.googletagmanager.com",
              "connect-src 'self' https://challenges.cloudflare.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://vercel.live https://www.google-analytics.com https://www.googletagmanager.com",
              "frame-src https://challenges.cloudflare.com https://vercel.live",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
