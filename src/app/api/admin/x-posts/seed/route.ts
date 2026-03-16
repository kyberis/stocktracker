import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createXPost, listXPosts } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

interface SeedPost {
  content: string;
  hashtags: string;
  dayOffset: number;
  hour: number;
}

const SEED_POSTS: SeedPost[] = [
  {
    dayOffset: 0,
    hour: 10,
    hashtags: "#buildinpublic #portfoliotracker #FinTwit",
    content: `I built a portfolio tracker for European investors.

Why? Because most trackers are either:
→ Too expensive ($10-20/mo)
→ English-only
→ Can't import from European brokers

trefolio fixes all three:
✓ 14 broker imports (DEGIRO, IBKR, T212, Revolut, and more)
✓ 35 European languages
✓ AI-powered analysis
✓ From 2.99 EUR/month — free tier available

trefolio.app`,
  },
  {
    dayOffset: 1,
    hour: 9,
    hashtags: "#buildinpublic #europeaninvesting",
    content: `The portfolio tracker market has a Europe problem.

Most tools are built for US investors. They support Schwab and Fidelity, but try importing your DEGIRO CSV? Good luck.

I've spent 4 months building native parsers for European brokers:
- DEGIRO
- Interactive Brokers
- Trading 212
- Revolut
- Nordnet
- eToro
- And 8 more

All free. No column mapping. Just drag and drop.`,
  },
  {
    dayOffset: 2,
    hour: 12,
    hashtags: "#fintech #multilingual #buildinpublic",
    content: `Your portfolio tracker should speak your language.

trefolio supports 35 European languages — every EU official language plus Norwegian, Ukrainian, Turkish, and more.

AI insights? Also in your language.
Dashboard? In your language.
Tax reports? In your language.

Because investing is hard enough without translating your tools.`,
  },
  {
    dayOffset: 3,
    hour: 10,
    hashtags: "#buildinpublic #nextjs #indiehacker",
    content: `Here's what powers trefolio under the hood:

→ Next.js 14 on Vercel (serverless, fast cold starts)
→ Turso (libSQL) for the database
→ Upstash Redis for rate limiting
→ Stripe for subscriptions
→ Yahoo Finance + Alpha Vantage for market data
→ OpenAI for AI analysis
→ Resend for emails
→ Grafana Cloud for observability

Total infra cost at launch: under 20 EUR/month.

Solo founder. 38 versions shipped since December.`,
  },
  {
    dayOffset: 4,
    hour: 14,
    hashtags: "#buildinpublic #shipping #SaaS",
    content: `trefolio v1.38 shipped today.

Since December 2025, I've shipped 38 versions:
- 14 broker import parsers
- EU tax reports for 5 countries
- Stock screener (600+ stocks)
- Net worth tracking
- DRIP simulation
- 35 languages
- 4 dashboard themes

All as a solo founder.

The hardest part wasn't coding. It was deciding what NOT to build.`,
  },
  {
    dayOffset: 7,
    hour: 9,
    hashtags: "#investing #portfoliotracker",
    content: `I check my portfolio 5+ times a day. I bet you do too.

The problem: every check means unlocking your phone, opening an app, waiting for it to load, scrolling through noise.

I wanted something that just shows me:
→ Total value
→ Daily change
→ Top movers
→ Dividend income

That's it. No news walls. No social feeds. No screaming notifications.

Just clarity.`,
  },
  {
    dayOffset: 8,
    hour: 11,
    hashtags: "#AI #investing #FinTwit",
    content: `"What do you think about ASML?"

I asked trefolio's AI this. Here's what it returned — in plain language, no jargon:

→ Business model breakdown
→ Revenue trend analysis
→ Competitive positioning
→ Risk factors
→ Valuation context

All in my language. Not English-translated. Actually written in my language.

5 free AI calls/month. No credit card needed.`,
  },
  {
    dayOffset: 9,
    hour: 10,
    hashtags: "#FinTwit #investing #value",
    content: `Portfolio tracker pricing in 2026:

Seeking Alpha: $19.99/mo
Simply Wall St: $10.00/mo
Snowball Analytics: $8.00/mo

trefolio Pro: 7.99 EUR/mo
trefolio Starter: 2.99 EUR/mo
trefolio Free: 0 EUR/mo

And only trefolio has:
✓ 14 broker imports
✓ 35 languages
✓ EU tax reports
✓ AI in your language
✓ Stock screener
✓ Net worth tracking

Something doesn't add up.`,
  },
  {
    dayOffset: 10,
    hour: 10,
    hashtags: "#buildinpublic #engineering",
    content: `How I built CSV parsers for 14 different brokers (and why it nearly broke me):

Every broker exports a different format. Different column names. Different date formats. Different decimal separators.

DEGIRO alone changed their export format 3 times in the past year.

Trading 212 doesn't export a snapshot — it exports a transaction history. You reconstruct holdings from hundreds of events.

IBKR? Their CSV is 15 different CSVs stitched together with section headers.

The fix: a shared parser architecture. Each broker gets an adapter that normalizes their mess into a universal format.

14 brokers. 0 column mapping. Drag, drop, done.`,
  },
  {
    dayOffset: 11,
    hour: 12,
    hashtags: "#investing #buildinpublic",
    content: `The moment I realized I needed to build trefolio:

I was on vacation. Opened my phone to "quickly check" my portfolio. 20 minutes later I was still scrolling through news, Reddit threads, and analyst opinions.

My partner: "You said you'd be 2 minutes."

I wanted a way to glance — not scroll. See the number, feel the confidence, move on with my life.

That's what trefolio does.`,
  },
  {
    dayOffset: 14,
    hour: 11,
    hashtags: "#taxes #europeaninvesting #fintech",
    content: `Tax season in Europe is chaos for investors.

Germany wants Anlage KAP with Vorabpauschale.
France wants Déclaration 2074.
Spain wants Modelo 100 and checks for wash sales.
Netherlands wants Box 3 wealth tax.
Italy wants Quadro RT/RW plus IVAFE.

trefolio generates the right report for your country. With an AI Tax Assistant that checks your data quality and suggests optimizations.

Available with Trefolio Pro.`,
  },
  {
    dayOffset: 15,
    hour: 9,
    hashtags: "#investing #FinTwit #education",
    content: `TTWROR vs IRR — which performance metric should you trust?

TTWROR (Time-Weighted): Shows how your picks performed, ignoring when you added money. Best for judging stock selection skill.

IRR/XIRR (Money-Weighted): Shows your actual return including timing of deposits. Best for judging real wealth growth.

You need both. Most trackers give you neither.

trefolio shows both — calculated from your actual transaction history.`,
  },
  {
    dayOffset: 16,
    hour: 14,
    hashtags: "#FinTwit #investing",
    content: `Honest question for European investors:

What's the #1 thing your current portfolio tracker gets wrong?

I've spent months fixing the things that frustrated me:
- Unreliable broker imports
- English-only interfaces
- Missing performance metrics
- Expensive subscriptions

But I want to know what I'm missing.

Reply or DM — I read everything.`,
  },
  {
    dayOffset: 18,
    hour: 11,
    hashtags: "#investing #Saturday #desksetup",
    content: `Saturday morning portfolio check.

3 seconds. That's how long it takes.

Open trefolio → see total value, daily change, top movers, dividend income → close the tab.

No infinite scroll. No notification anxiety. No "just one more article."

Your portfolio, understood.

Try it free → trefolio.app`,
  },
];

function scheduleDateUTC(baseDate: Date, dayOffset: number, hour: number): string {
  const d = new Date(baseDate);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const POST = withMetrics("/api/admin/x-posts/seed", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const existing = await listXPosts();
  if (existing.length > 0) {
    return NextResponse.json({ error: "Posts already exist. Delete them first to re-seed." }, { status: 409 });
  }

  const baseDate = new Date();
  baseDate.setUTCHours(0, 0, 0, 0);

  const created = [];
  for (const seed of SEED_POSTS) {
    const post = await createXPost({
      content: seed.content,
      hashtags: seed.hashtags,
      scheduledAt: scheduleDateUTC(baseDate, seed.dayOffset, seed.hour),
    });
    created.push(post.id);
  }

  return NextResponse.json({ ok: true, count: created.length });
});
