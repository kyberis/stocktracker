/**
 * Seed script for moat screener X/Twitter posts.
 * Run via: npx tsx scripts/seed-moat-x-posts.ts
 *
 * Inserts posts into scheduled_x_posts via the DB layer directly.
 * Posts are scheduled starting tomorrow, spread across the next 2 weeks.
 */

import { createXPost } from "../src/lib/db/x-posts";
import { ensureInitialized } from "../src/lib/db/client";

interface SeedPost {
  content: string;
  hashtags: string;
  dayOffset: number;
  hour: number;
}

const MOAT_POSTS: SeedPost[] = [
  {
    dayOffset: 1,
    hour: 10,
    hashtags: "#investing #FinTwit #valueinvesting",
    content: `We just launched the Moat Screener on trefolio.

680+ stocks scored on 8 Buffett-style criteria — automatically, every week.

The idea is simple: Warren Buffett's investment framework, applied at scale. Instead of reading 10-Ks for hours, you get a pass/warning/fail verdict on every metric that matters:

→ Earnings Consistency (10yr trend)
→ Gross Margin (≥40% benchmark)
→ Net Margin (≥20% benchmark)
→ Retained Earnings growth
→ Return on Equity
→ Debt Sustainability (<4yr payoff)
→ CapEx Efficiency (<25% of earnings)
→ Product Durability

Filter by score, sector, or individual criteria. Find high-moat stocks in seconds.

trefolio.com`,
  },
  {
    dayOffset: 2,
    hour: 14,
    hashtags: "#investing #valueinvesting #FinTwit",
    content: `Coca-Cola's moat, scored by our framework:

✅ Earnings Consistency — 10yr steady growth
✅ Gross Margin — 59% (benchmark: 40%)
✅ Net Margin — 23% (benchmark: 20%)
✅ Retained Earnings — growing
✅ ROE — high capital efficiency
✅ Debt — sustainable, <4yr payoff
✅ CapEx — only 9% of earnings
✅ Product Durability — same product for 130 years

The "duh" factor: when a product doesn't change, R&D stays low, brand compounds, and margins expand.

That's a moat.

Score it yourself → trefolio.com`,
  },
  {
    dayOffset: 4,
    hour: 11,
    hashtags: "#investing #stocks #Apple",
    content: `Apple scores high on our Buffett moat analysis — but it's not a slam dunk.

✅ Gross Margin: ~45%
✅ Net Margin: ~26%
✅ ROE: extremely high
✅ CapEx: under 25% of earnings
⚠️ Retained Earnings: declining (massive buybacks)

The retained earnings dip isn't a red flag when you adjust for $100B+ in buybacks. Buffett himself called Apple his best investment.

Our framework flags the buyback adjustment automatically.

680+ stocks scored → trefolio.com`,
  },
  {
    dayOffset: 6,
    hour: 9,
    hashtags: "#investing #FinTwit #fundamentals",
    content: `The #1 signal of a durable competitive advantage, according to Buffett:

Consistency.

Not revenue growth. Not innovation. Consistency.

A company that sells the same product for decades avoids:
→ Retooling costs
→ Brand rebuilding
→ R&D treadmills
→ Inventory write-downs
→ Training costs

Coca-Cola hasn't changed its core product in 130 years. That's not laziness — that's a moat.

Our screener scores Product Durability as one of 8 criteria. Most stocks fail it.`,
  },
  {
    dayOffset: 8,
    hour: 12,
    hashtags: "#investing #valueinvesting #screener",
    content: `Why gross margin matters more than revenue:

Revenue can be bought. Gross margin reveals whether a business actually scales.

Buffett benchmark: 40%+

Companies above 40%:
→ Visa: ~67%
→ Microsoft: ~69%
→ Mastercard: ~57%
→ Coca-Cola: ~59%

Companies below 40%:
→ Ford: ~11%
→ General Electric: ~26%
→ Intel: ~40% (borderline)

High gross margin = pricing power = moat.

We score this automatically for 680+ stocks on trefolio.`,
  },
  {
    dayOffset: 10,
    hour: 10,
    hashtags: "#stocks #investing #FinTwit",
    content: `Debt sustainability: the Buffett litmus test most investors skip.

The rule: can the company pay off ALL long-term debt with less than 4 years of net earnings?

If yes → the company doesn't need debt to grow. It has real pricing power.

If no → it might be manufacturing returns through leverage.

Banks are the exception (debt IS their business model).

This is criterion #6 in our moat framework. Many "quality" stocks quietly fail it.

Screen 680+ companies → trefolio.com`,
  },
  {
    dayOffset: 12,
    hour: 14,
    hashtags: "#investing #FinTwit #CapEx",
    content: `CapEx as a % of net earnings — the most underrated metric in investing.

Buffett tiers:
→ Very Good: <25% (the company barely reinvests to maintain position)
→ Acceptable: <50%
→ Warning: >50% (capital treadmill)

Apple: ~9% — barely spends to maintain dominance
Coca-Cola: ~11% — the product doesn't need factories rebuilt
Tesla: ~90%+ — constantly building to stay competitive

Low CapEx = free cash flow = compounding machine.

Our moat screener scores this automatically across 680+ stocks.`,
  },
  {
    dayOffset: 14,
    hour: 11,
    hashtags: "#investing #stocks #valueinvesting",
    content: `The exit signal most value investors ignore:

P/E of 40 or higher.

Buffett's framework says: even a great moat can't justify any price. When P/E hits 40, the market is pricing in a future that's too perfect.

Our moat screener shows the P/E alongside the score. So you can find:

→ High moat + reasonable P/E = opportunity
→ High moat + insane P/E = wait

The screener isn't just about finding quality. It's about finding value.

trefolio.com`,
  },
];

function scheduleDateUTC(baseDate: Date, dayOffset: number, hour: number): string {
  const d = new Date(baseDate);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function main() {
  await ensureInitialized();

  const baseDate = new Date();
  baseDate.setUTCHours(0, 0, 0, 0);

  console.log(`Seeding ${MOAT_POSTS.length} moat screener X posts...`);

  for (const seed of MOAT_POSTS) {
    const scheduledAt = scheduleDateUTC(baseDate, seed.dayOffset, seed.hour);
    const fullLength = seed.content.length + (seed.hashtags ? 2 + seed.hashtags.length : 0);
    const post = await createXPost({
      content: seed.content,
      hashtags: seed.hashtags,
      scheduledAt,
    });
    console.log(`  ✓ ${post.id} — day +${seed.dayOffset} ${seed.hour}:00 UTC (${fullLength} chars)`);
  }

  console.log(`\nDone. ${MOAT_POSTS.length} posts scheduled.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
