# trefolio — X (Twitter) Account Playbook

Ready-to-use profile data and first 14 posts to activate the account before running ads.

---

## 1. Profile Setup

| Field | Value |
|-------|-------|
| **Display name** | trefolio |
| **Handle** | `@trefolio_app` (fallbacks: `@trefolioHQ`, `@get_trefolio`) |
| **Bio** | The extra leaf for your portfolio 🍀 AI-powered tracker for European investors · 14 broker imports · 35 languages · Free to start ↓ |
| **Location** | Europe 🇪🇺 |
| **Website** | `https://trefolio.com` (or current domain) |
| **Category** | Business & Finance |
| **Professional account** | Yes — select "Business" → "Software" |

### Profile Image (400×400 px)

Use the trefolio clover icon (`public/trefolio-icon-foil.svg`) on a `#0f172a` (dark slate) background. Export as PNG 400×400.

### Banner Image (1500×500 px)

Dark banner with:
- Left: trefolio logo (`public/trefolio-logo-foil.svg`) in emerald (#10b981)
- Center/right: a clean dashboard screenshot (dark mode, showing portfolio with gains)
- Bottom-right text: "Every portfolio deserves a bit of luck. trefolio.com"
- Background: `#0f172a` with a subtle gradient to `#1e293b`

### Pinned Tweet

Use **Post #1** below as the pinned tweet.

---

## 2. Growth Actions (First 30 Days)

### Daily Actions (10-15 min/day)

| Action | Why |
|--------|-----|
| **Post 1x/day** from the queue below | Consistency signals active account to X algo |
| **Reply to 5 tweets** in #FinTwit, #investing, #buildinpublic | Replies from a new account get more eyeballs than standalone tweets |
| **Follow 10-15 accounts** in the target niche daily | Finance creators, European investors, indie hackers, desk-setup accounts |
| **Like and retweet** 5-10 relevant posts per day | Builds relationships; people check who liked their stuff |
| **Use 2-3 hashtags per post** (not more) | #buildinpublic #FinTwit #portfoliotracker are the core three |

### Accounts to Follow and Engage With First

| Category | Accounts to follow |
|----------|--------------------|
| **Build in public** | @levelsio, @marckohlbrugge, @tdinh_me, @johnonolan, @araborak |
| **Indie hackers / SaaS** | @paborenstein, @IndieHackers, @ProductHunt, @BetaList |
| **European investing** | @EuropeanETFs, @JustETF, @DutchDividend, @GermanStocks |
| **Fintech** | @FinTechWeekly, @DEGIROeu, @ABORETFIB, @RevolutApp |
| **Desk setup / gadgets** | @UltraLinx, @MinimalSetups, @Jeff_Sudo |
| **Tech / dev** | @vercel, @nextjs, @turaborso, @upstash |

### Reply Strategy

Find these conversations and add genuine value:

- People asking "best portfolio tracker?" → reply with your honest take + mention trefolio
- "How do you track your investments?" threads → share your workflow
- DEGIRO/IBKR/T212 complaint threads → empathize, mention you built import for them
- #buildinpublic milestone posts → congratulate, share your own numbers
- European investing discussions → contribute thoughtful takes

**Golden rule:** 80% value, 20% product mention. Never lead with a pitch.

### Weekly Actions

| Action | When |
|--------|------|
| Post a **thread** (build log or educational) | Tuesday or Wednesday |
| Share a **screenshot/GIF** of a new feature | Thursday |
| Post a **milestone update** | Friday |
| **DM 2-3 creators** who might want to try trefolio | Sunday evening |

---

## 3. First 14 Posts (Copy-Paste Ready)

Each post includes the text, suggested image, and best posting time (CET).

---

### Post #1 — Introduction (PIN THIS)

**Post at:** Any day, 10:00 CET

```
I built a portfolio tracker for European investors. 🍀

The name? trefolio — a clover. But ours has four leaves: the rare lucky kind. Green like the dollar. Green like gains. Green like growth.

Why? Because most trackers are either:
→ Too expensive ($10-20/mo)
→ English-only
→ Can't import from European brokers

trefolio fixes all three:
✓ 14 broker imports (DEGIRO, IBKR, T212, Revolut, and more)
✓ 35 European languages
✓ AI-powered analysis in your language
✓ From 2.99 EUR/month — free tier available

Every portfolio deserves a bit of luck.

trefolio.com
```

**Image:** Dashboard screenshot (dark mode, portfolio showing green gains)
**Hashtags:** #buildinpublic #portfoliotracker #FinTwit

---

### Post #2 — The Problem

**Post at:** Tuesday, 09:00 CET

```
The portfolio tracker market has a Europe problem.

Most tools are built for US investors. They support Schwab and Fidelity, but try importing your DEGIRO CSV? Good luck.

I've spent 4 months building native parsers for European brokers:
- DEGIRO
- Interactive Brokers
- Trading 212
- Revolut
- Nordnet
- eToro
- And 8 more

All free. No column mapping. Just drag and drop.
```

**Image:** Screenshot of the import page showing broker logos
**Hashtags:** #buildinpublic #europeaninvesting

---

### Post #3 — Feature Highlight: Languages

**Post at:** Wednesday, 12:00 CET

```
Your portfolio tracker should speak your language.

trefolio supports 35 European languages — every EU official language plus Norwegian, Ukrainian, Turkish, and more.

AI insights? Also in your language.
Dashboard? In your language.
Tax reports? In your language.

Because investing is hard enough without translating your tools.
```

**Image:** GIF or screenshot of the language selector dropdown showing multiple languages
**Hashtags:** #fintech #multilingual #buildinpublic

---

### Post #4 — Build Log: The Tech Stack

**Post at:** Thursday, 10:00 CET

```
Here's what powers trefolio under the hood:

→ Next.js 14 on Vercel (serverless, fast cold starts)
→ Turso (libSQL) for the database
→ Upstash Redis for rate limiting
→ Stripe for subscriptions
→ Yahoo Finance + Alpha Vantage for market data
→ OpenAI for AI analysis
→ Resend for emails
→ Grafana Cloud for observability

Total infra cost at launch: under 20 EUR/month.

Solo founder. 38 versions shipped since December.
```

**Image:** None (text-only performs well for dev audiences)
**Hashtags:** #buildinpublic #nextjs #indiehacker

---

### Post #5 — Social Proof / Milestone

**Post at:** Friday, 14:00 CET

```
trefolio v1.38 shipped today.

Since December 2025, I've shipped 38 versions:
- 14 broker import parsers
- EU tax reports for 5 countries
- Stock screener (600+ stocks)
- Net worth tracking
- DRIP simulation
- 35 languages
- 4 dashboard themes

All as a solo founder.

The hardest part wasn't coding. It was deciding what NOT to build.
```

**Image:** Screenshot of the release notes page or a visual showing version timeline
**Hashtags:** #buildinpublic #shipping #SaaS

---

### Post #6 — Pain Point

**Post at:** Monday, 09:00 CET

```
I check my portfolio 5+ times a day. I bet you do too.

The problem: every check means unlocking your phone, opening an app, waiting for it to load, scrolling through noise.

I wanted something that just shows me:
→ Total value
→ Daily change
→ Top movers
→ Dividend income

That's it. No news walls. No social feeds. No screaming notifications.

Just clarity.
```

**Image:** Clean screenshot of the trefolio dashboard summary card
**Hashtags:** #investing #portfoliotracker

---

### Post #7 — Feature Highlight: AI

**Post at:** Tuesday, 11:00 CET

```
"What do you think about ASML?"

I asked trefolio's AI this. Here's what it returned — in plain language, no jargon:

→ Business model breakdown
→ Revenue trend analysis
→ Competitive positioning
→ Risk factors
→ Valuation context

All in my language. Not English-translated. Actually written in my language.

5 free AI calls/month. No credit card needed.
```

**Image:** Screenshot of an AI analysis response for ASML in the app
**Hashtags:** #AI #investing #FinTwit

---

### Post #8 — Comparison / Value

**Post at:** Wednesday, 10:00 CET

```
Portfolio tracker pricing in 2026:

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

Something doesn't add up.
```

**Image:** Price comparison graphic (dark background, emerald accent)
**Hashtags:** #FinTwit #investing #value

---

### Post #9 — Build Log Thread: Import Parser

**Post at:** Thursday, 10:00 CET

```
🧵 How I built CSV parsers for 14 different brokers (and why it nearly broke me)

1/ Every broker exports a different format. Different column names. Different date formats. Different decimal separators. Some use semicolons. Some use tabs.

2/ DEGIRO alone has changed their export format 3 times in the past year. My parser has to handle all three variants.

3/ Trading 212 doesn't export a portfolio snapshot — they export a transaction history. You have to reconstruct the current holdings from hundreds of buy/sell/dividend events.

4/ Interactive Brokers? Their CSV is actually 15 different CSVs stitched together with section headers. You have to split it first, then parse each section differently.

5/ The solution: a shared parser architecture. Each broker gets an adapter that normalizes their mess into a universal format. Deduplication, ISIN resolution, and multi-currency conversion happen in one shared pipeline.

6/ 14 brokers. 0 column mapping. Drag, drop, done.

If you use DEGIRO, IBKR, Trading 212, Revolut, Nordnet, Schwab, Fidelity, eToro, or others — try it free at trefolio.com
```

**Image (tweet 1):** Diagram showing broker CSVs → unified pipeline → dashboard
**Hashtags:** #buildinpublic #engineering

---

### Post #10 — Emotional / Relatable

**Post at:** Friday, 12:00 CET

```
The moment I realized I needed to build trefolio:

I was on vacation. Opened my phone to "quickly check" my portfolio. 20 minutes later I was still scrolling through news, Reddit threads, and analyst opinions.

My partner: "You said you'd be 2 minutes."

I wanted a way to glance — not scroll. See the number, feel the confidence, move on with my life.

That's what trefolio does.
```

**Image:** None (story tweets perform well without images)
**Hashtags:** #investing #buildinpublic

---

### Post #11 — Feature Highlight: Tax Reports

**Post at:** Monday, 11:00 CET

```
Tax season in Europe is chaos for investors.

Germany wants Anlage KAP with Vorabpauschale and Sparerpauschbetrag.
France wants Déclaration 2074.
Spain wants Modelo 100 and checks for wash sales.
Netherlands wants Box 3 wealth tax.
Italy wants Quadro RT/RW plus IVAFE.

trefolio generates the right report for your country. With an AI Tax Assistant that checks your data quality and suggests optimizations.

Available with Trefolio Pro.
```

**Image:** Screenshot of the tax report page showing a country selector
**Hashtags:** #taxes #europeaninvesting #fintech

---

### Post #12 — Quick Tip (Educational)

**Post at:** Tuesday, 09:30 CET

```
TTWROR vs IRR — which performance metric should you trust?

TTWROR (Time-Weighted): Shows how your picks performed, ignoring when you added money. Best for judging your stock selection skill.

IRR/XIRR (Money-Weighted): Shows your actual return including timing of deposits. Best for judging your real wealth growth.

You need both. Most trackers give you neither.

trefolio shows both — calculated from your actual transaction history, not estimates.
```

**Image:** Side-by-side of TTWROR and IRR numbers from the trefolio performance view
**Hashtags:** #investing #FinTwit #education

---

### Post #13 — Social Proof / Ask

**Post at:** Wednesday, 14:00 CET

```
Honest question for European investors:

What's the #1 thing your current portfolio tracker gets wrong?

I've spent months fixing the things that frustrated me:
- Unreliable broker imports
- English-only interfaces
- Missing performance metrics
- Expensive subscriptions

But I want to know what I'm missing.

Reply or DM — I read everything.
```

**Image:** None (engagement tweets work best without images)
**Hashtags:** #FinTwit #investing

---

### Post #14 — Weekend Showcase

**Post at:** Saturday, 11:00 CET

```
Saturday morning portfolio check.

3 seconds. That's how long it takes.

Open trefolio → see total value, daily change, top movers, dividend income → close the tab.

No infinite scroll. No notification anxiety. No "just one more article."

Every portfolio deserves a bit of luck. 🍀

Try it free → trefolio.com
```

**Image:** Clean, minimal screenshot of the dashboard with morning light desk vibes
**Hashtags:** #investing #Saturday #desksetup

---

## 4. Brand Voice & Identity

### The Four-Leaf Clover

trefolio's brand is built on the four-leaf clover — the rare, lucky kind:

- **"trefolio"** comes from "trébol" (Spanish for clover). A standard clover has three leaves; ours has four — the lucky variant.
- **Green** represents three things: the color of money, positive market moves, and growth.
- **The extra leaf** is what trefolio adds to your investing journey — better data, smarter tools, a bit of good fortune.

### How to Use It on X

- Use 🍀 (not ☘️) — the four-leaf clover emoji — in key posts (pinned, milestones, CTAs). Don't overuse it; once per post max.
- The brand tagline is: **"Every portfolio deserves a bit of luck."** Use it as a closer on high-intent posts (pinned, pricing, CTA).
- Reference the color green naturally when talking about gains, growth, or the dashboard aesthetic.
- Don't explain the clover concept in every post — let it live in the bio and pinned post, then surface naturally.

### Tone Rules

- Confident but never pushy. Second person ("you/your"), present tense.
- Honest about what the product does. No hype, no financial advice.
- Serious about investing, friendly about everything else.
- 80% value, 20% product. Never lead with a pitch.

---

## 5. Content Themes (Rotating Weekly)

After the first 14 posts, rotate through these themes:

| Day | Theme | Format |
|-----|-------|--------|
| **Monday** | Pain point / problem awareness | Short tweet, no image |
| **Tuesday** | Build log or educational thread | Thread (5-10 tweets) |
| **Wednesday** | Feature highlight | Screenshot or GIF |
| **Thursday** | Engagement (question, poll, ask) | Text only |
| **Friday** | Milestone / shipping update | Screenshot + numbers |
| **Saturday** | Lifestyle (desk, workflow, relatable) | Photo or screenshot |
| **Sunday** | Rest or light reply engagement | No post |

---

## 6. Hashtag Strategy

### Primary (use 1-2 per post)

- `#buildinpublic` — community of makers who engage heavily
- `#FinTwit` — finance Twitter, high-intent audience
- `#portfoliotracker` — niche but exactly your product

### Secondary (rotate)

- `#indiehacker` — for build/milestone posts
- `#europeaninvesting` — for EU-specific content
- `#investing` — broad reach
- `#fintech` — industry visibility
- `#SaaS` — for business model posts

### Avoid

- More than 3 hashtags per post (looks spammy)
- Generic tags like `#tech` `#startup` `#motivation`
- Hashtag-only tweets

---

## 7. Key Metrics to Track (First 30 Days)

| Metric | Target | How to Check |
|--------|--------|--------------|
| Followers | 100+ | Profile |
| Average impressions per tweet | 500+ | X Analytics |
| Profile visits per week | 200+ | X Analytics |
| Link clicks (to trefolio.com) | 30+ per week | X Analytics + UTM params |
| Engagement rate | > 2% | X Analytics |
| Replies received | 5+ per post (for engagement posts) | Manual |
| DM conversations | 3+ per week | Manual |

---

## 8. UTM Parameters

Always use UTM tracking when linking to trefolio.com:

```
https://trefolio.com?utm_source=x&utm_medium=organic&utm_campaign=buildinpublic
```

For specific posts:

```
https://trefolio.com?utm_source=x&utm_medium=organic&utm_campaign=post-01-intro
https://trefolio.com?utm_source=x&utm_medium=organic&utm_campaign=post-08-pricing
```

---

*Last updated: March 2026*
