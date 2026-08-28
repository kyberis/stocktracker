import type { AgentAccent } from "@/components/agents/AgentCard";

export type StudioAgent = {
  name: string;
  role: string;
  description: string;
  accent: AgentAccent;
  iconSrc: string;
  href?: string;
  cta?: string;
  external?: boolean;
  caseStudy?: string;
};

export const STUDIO_AGENTS: StudioAgent[] = [
  {
    name: "Clover",
    role: "trefolio assistant",
    description:
      "One chat for portfolio and personal finance — Clover orchestrates Warren and Clara behind the scenes so you never pick which agent to ask.",
    accent: "emerald",
    iconSrc: "/avatars/clover-512.png",
    href: "/signup",
    cta: "Open trefolio",
  },
  {
    name: "Warren",
    role: "Investment analyst",
    description:
      "Portfolio analysis, MOAT research, and AI insights inside trefolio — the specialist Clover calls for holdings and markets.",
    accent: "emerald",
    iconSrc: "/avatars/warren-512.png",
    href: "/signup",
    cta: "Open trefolio",
  },
  {
    name: "Clara",
    role: "Personal finance",
    description:
      "Tracks expenses, budgets, savings goals, and recurring bills. Chat about money on the web or Telegram — including a desktop month spreadsheet view.",
    accent: "amber",
    iconSrc: "/avatars/clara-512.png",
    href: "https://clara.trefolio.com",
    cta: "Try Clara",
    external: true,
  },
  {
    name: "Will",
    role: "Smart notes",
    description:
      "Captures voice notes and meeting transcripts, summarises them, and links related notes automatically — ideal for investing journals and decision logs.",
    accent: "violet",
    iconSrc: "/avatars/will-512.png",
    href: "https://will.trefolio.com",
    cta: "Try Will",
    external: true,
  },
  {
    name: "Renata",
    role: "AI CV writing",
    description:
      "Helps professionals draft and refine CVs with AI — structured sections, tone control, and export-ready output.",
    accent: "rose",
    iconSrc: "/avatars/renata-512.png",
    href: "https://renata.trefolio.com",
    cta: "Try Renata",
    external: true,
  },
  {
    name: "Roxana",
    role: "WhatsApp B2B sales",
    description:
      "A production WhatsApp sales agent that qualifies leads and supports B2B conversations — deployed for a real packaging manufacturer.",
    accent: "sky",
    iconSrc: "/avatars/roxana-512.png",
    caseStudy: "Running live inside PL Packaging",
  },
];

export const STUDIO_PLATFORM_POINTS = [
  {
    title: "Multi-agent orchestration",
    body: "Agents can coordinate on shared missions with clear ownership — Warren may consult Clara or Will when a task spans portfolio, cash, and notes.",
  },
  {
    title: "Omni-channel delivery",
    body: "Reach users where they already work: web apps, Telegram bots, and WhatsApp (via Roxana) on the same confirm-before-write patterns.",
  },
  {
    title: "Confirm before write",
    body: "Nothing persists without an explicit Confirm step. Proposals stay proposals until the user approves — a safety pattern across the studio.",
  },
  {
    title: "35 languages",
    body: "trefolio ships UI strings in 35 European languages so investors and partners can evaluate the product in their own locale.",
  },
  {
    title: "MCP-native tooling",
    body: "Personal access tokens connect Cursor, Claude Code, and other MCP clients to portfolio reads and Warren workflows.",
  },
] as const;
