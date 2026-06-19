import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect Claude Code & Cursor to your portfolio — trefolio MCP",
  description:
    "Step-by-step guide: generate a personal access token on user.trefolio.com (Developer · MCP tokens) and configure Claude Code or Cursor to use trefolio MCP tools.",
  alternates: { canonical: "https://trefolio.com/landing/mcp" },
  openGraph: {
    title: "trefolio MCP — Claude Code & Cursor setup",
    description:
      "Generate your tfp_pat token and connect Claude Code, Cursor, or Claude Desktop to your portfolio and Warren MOAT tools.",
    url: "https://trefolio.com/landing/mcp",
    images: [{ url: "/screenshots/mcp-claude-thinking-trefolio.png", width: 1280, height: 883 }],
  },
};

export default function McpLandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
