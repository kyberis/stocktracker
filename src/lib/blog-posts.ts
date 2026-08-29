import { registerPost } from "./blog";

registerPost({
  slug: "best-portfolio-trackers-europe-2026",
  title: "Best Portfolio Trackers for European Investors in 2026",
  description:
    "A practical comparison of portfolio tracking tools available to European investors — what they cost, what they do, and which one fits your needs.",
  date: "2026-03-08",
  readingTime: "8 min read",
  keywords: [
    "best portfolio tracker europe",
    "portfolio tracker european investors",
    "stock portfolio tracker 2026",
    "trefolio vs simply wall st",
    "free portfolio tracker europe",
  ],
  content: /* html */ `
<h2>Why European Investors Need a Dedicated Tracker</h2>
<p>If you hold stocks or ETFs across multiple European exchanges, you already know the pain: your broker shows your positions, but not your total portfolio. You check one app for XETRA holdings, another for NYSE, and a spreadsheet for everything else. Dividends? Good luck tracking those across currencies.</p>
<p>Portfolio trackers solve this by pulling everything into one view. But many popular tools pile on features — screeners, social feeds, news firehoses — while missing what actually matters: clear portfolio evolution, accurate performance metrics, and reliable broker imports that don't drop transactions.</p>
<p>We compared the most relevant options for EU-based investors in 2026, focusing on what actually matters: multi-exchange support, broker imports, currency handling, and cost.</p>

<h2>The Contenders</h2>

<h3>1. trefolio</h3>
<p><strong>Price:</strong> Free / Basic (€4.99) / Pro (€9.99) / Wealth · Ultra (€24.99) per month</p>
<p><strong>Best for:</strong> European investors who want one-click broker imports and AI analysis</p>
<p>trefolio is a web-based tracker built specifically for European investors. It supports direct CSV imports from DEGIRO, Interactive Brokers, Trading 212, and Revolut — the four most popular brokers in Europe. The Folio tier includes real-time quotes, charts, and basic AI analysis. Trefolio unlocks unlimited holdings, company fundamentals, news sentiment, and unlimited AI calls.</p>
<p>Strengths: native European broker imports, 35 languages, multi-currency (EUR, USD, GBP, DKK, CAD), clean UI, AI-powered portfolio review. Available as a PWA with an iOS home screen widget.</p>
<p>Weaknesses: newer product, no native mobile app (PWA only), no direct API sync for most brokers (IBKR API is supported).</p>

<h3>2. Simply Wall St</h3>
<p><strong>Price:</strong> Free (limited) / $10/month</p>
<p><strong>Best for:</strong> Visual analysis of individual stocks</p>
<p>Simply Wall St focuses on stock analysis with its signature snowflake visualization. It shows valuation, growth, health, dividends, and management scores for individual companies. It does support some broker imports (including DEGIRO), but the portfolio tracking is secondary to the analysis tools — the focus is on individual stock scores, not on your portfolio's evolution over time.</p>
<p>Strengths: beautiful stock visualizations, global coverage, strong fundamental data, DEGIRO import available.</p>
<p>Weaknesses: twice the price, portfolio evolution and performance metrics are not the focus, lots of features that can feel overwhelming when you just want to see how your portfolio is doing.</p>

<h3>3. Portfolio Performance</h3>
<p><strong>Price:</strong> Free (open source)</p>
<p><strong>Best for:</strong> Power users who want full control</p>
<p>Portfolio Performance is a desktop Java application that's been around for years. It's comprehensive: supports dozens of data providers, complex transaction types, and detailed reporting. The trade-off is complexity — setup takes time, and the UI feels dated.</p>
<p>Strengths: free, open source, extremely flexible, strong community.</p>
<p>Weaknesses: desktop only, steep learning curve, no mobile access, manual setup for data sources.</p>

<h3>4. Seeking Alpha</h3>
<p><strong>Price:</strong> Free (limited) / $19.99/month</p>
<p><strong>Best for:</strong> US-focused research and analysis</p>
<p>Seeking Alpha is primarily a research platform. The portfolio tracker is a secondary feature. It excels at earnings analysis, dividend grades, and community research — but the focus is stock research, not portfolio performance tracking. For European investors, the content and analysis skew heavily toward US markets.</p>
<p>Strengths: deep research, strong community, dividend grades.</p>
<p>Weaknesses: expensive, US market focus, no European broker imports, portfolio tracking and evolution are not the priority.</p>

<h3>5. Google Sheets / Excel</h3>
<p><strong>Price:</strong> Free</p>
<p><strong>Best for:</strong> Maximum customization</p>
<p>The spreadsheet approach gives you total control. Google Finance functions pull live prices, and you can build any view you want. But you're building everything from scratch: currency conversion, performance calculations, dividend tracking — it's all manual.</p>
<p>Strengths: free, infinitely customizable, you own the data.</p>
<p>Weaknesses: significant time investment, no automation, formulas break, no mobile experience, no AI analysis.</p>

<h2>Feature Comparison</h2>

<table>
<thead>
<tr><th>Feature</th><th>trefolio</th><th>Simply Wall St</th><th>Portfolio Performance</th><th>Seeking Alpha</th></tr>
</thead>
<tbody>
<tr><td>Monthly cost</td><td>€0–7.99</td><td>$0–10</td><td>Free</td><td>$0–19.99</td></tr>
<tr><td>DEGIRO import</td><td>Yes (CSV)</td><td>Yes</td><td>Manual</td><td>No</td></tr>
<tr><td>IBKR import</td><td>Yes (CSV + API)</td><td>No</td><td>Yes (CSV)</td><td>No</td></tr>
<tr><td>Trading 212 import</td><td>Yes (CSV)</td><td>No</td><td>Manual</td><td>No</td></tr>
<tr><td>Revolut import</td><td>Yes (CSV)</td><td>No</td><td>Manual</td><td>No</td></tr>
<tr><td>Multi-currency</td><td>Automatic</td><td>Manual</td><td>Yes</td><td>Limited</td></tr>
<tr><td>AI analysis</td><td>Yes</td><td>No</td><td>No</td><td>No</td></tr>
<tr><td>Languages</td><td>35</td><td>English</td><td>8</td><td>English</td></tr>
<tr><td>Mobile</td><td>PWA + widget</td><td>iOS/Android</td><td>No</td><td>iOS/Android</td></tr>
<tr><td>Dividend tracking</td><td>Yes</td><td>Basic</td><td>Yes</td><td>Yes</td></tr>
</tbody>
</table>

<h2>Which Should You Pick?</h2>
<p><strong>If you use DEGIRO, IBKR, Trading 212, or Revolut</strong> and want a clean, modern tracker that just works: <a href="https://trefolio.com/signup">trefolio</a>. The one-click import alone saves hours compared to manual entry.</p>
<p><strong>If you want deep individual stock analysis</strong> and don't mind paying more: Simply Wall St gives you the best visual breakdown of individual companies, though portfolio evolution isn't its focus.</p>
<p><strong>If you want full control and don't mind complexity:</strong> Portfolio Performance is free and endlessly flexible — if you're comfortable with desktop software.</p>
<p><strong>If you're US-focused and want research:</strong> Seeking Alpha is unmatched for community-driven stock analysis, but it's not built for tracking your portfolio's evolution over time.</p>

<h2>Getting Started</h2>
<p>The fastest way to test any tracker is to import your actual portfolio. With trefolio, you can go from zero to a fully imported portfolio in under 2 minutes — just export your CSV from your broker, upload it, and you're done.</p>
<p><a href="https://trefolio.com/signup">Create a free trefolio account</a> and try it with your real holdings. No credit card required.</p>
`,
});

registerPost({
  slug: "how-to-import-degiro-portfolio",
  title: "How to Import Your DEGIRO Portfolio (Step by Step)",
  description:
    "Export your DEGIRO transactions as CSV and import them into trefolio in under 2 minutes. Complete guide with screenshots.",
  date: "2026-03-08",
  readingTime: "5 min read",
  lang: "en",
  alternates: {
    en: "how-to-import-degiro-portfolio",
    es: "mejor-tracker-inversiones-degiro",
    fr: "meilleur-suivi-portefeuille-degiro",
    de: "beste-portfolio-tracker-degiro",
    it: "miglior-tracker-portafoglio-degiro",
    pt: "melhor-tracker-carteira-degiro",
    nl: "beste-portfolio-tracker-degiro-nl",
    pl: "najlepszy-tracker-portfela-degiro",
    sv: "basta-portfoljtracker-degiro",
    da: "bedste-portefolje-tracker-degiro",
    fi: "paras-salkkuseuranta-degiro",
  },
  keywords: [
    "degiro csv export",
    "degiro portfolio import",
    "import degiro transactions",
    "degiro portfolio tracker",
    "degiro account csv",
  ],
  content: /* html */ `
<h2>Why Import Your DEGIRO Portfolio?</h2>
<p>DEGIRO is one of the most popular brokers in Europe, but its built-in portfolio view is limited. You can see your positions, but there's no AI analysis, no dividend projections, no multi-broker aggregation, and no performance metrics like TTWROR or IRR.</p>
<p>By importing your DEGIRO transactions into trefolio, you get a full dashboard with real-time quotes, performance tracking, dividend estimates, and AI-powered analysis — all from a single CSV export.</p>

<h2>Step 1: Export Your Account CSV from DEGIRO</h2>
<ol>
<li>Log in to your DEGIRO account at <strong>trader.degiro.nl</strong> (or your regional DEGIRO domain).</li>
<li>Go to <strong>Activity</strong> → <strong>Account</strong>.</li>
<li>Set the date range to cover all your transactions (tip: set the start date to when you opened the account).</li>
<li>Click <strong>Export</strong> and choose <strong>CSV</strong>.</li>
<li>Save the file — it will be named something like <code>Account.csv</code>.</li>
</ol>
<p>The exported CSV contains all your transactions: buys, sells, dividends, fees, and currency conversions. trefolio parses all of these automatically.</p>

<h2>Step 2: Import into trefolio</h2>
<ol>
<li>Go to <a href="https://trefolio.com/signup">trefolio.com</a> and sign up (or log in if you already have an account).</li>
<li>Navigate to the <strong>Import</strong> page from the sidebar.</li>
<li>Select <strong>DEGIRO</strong> as your import method.</li>
<li>Drag and drop your <code>Account.csv</code> file (or click to browse).</li>
<li>trefolio will parse all transactions and show you a preview — buys, sells, dividends, and fees.</li>
<li>Review the preview and click <strong>Import All</strong>.</li>
</ol>
<p>Your portfolio will appear on the dashboard immediately with real-time prices, total value, daily changes, and performance metrics.</p>

<h2>What Gets Imported?</h2>
<p>trefolio extracts the following from your DEGIRO CSV:</p>
<ul>
<li><strong>Buy and sell transactions</strong> — including exact prices, amounts, and dates</li>
<li><strong>Dividends</strong> — automatically detected and categorized</li>
<li><strong>Withholding taxes</strong> — parsed from tax entries</li>
<li><strong>Broker fees</strong> — DEGIRO transaction costs</li>
<li><strong>Cash balances</strong> — detected from deposits and withdrawals</li>
<li><strong>Currency conversions</strong> — multi-currency transactions handled automatically</li>
</ul>

<h2>After Import: What You Can Do</h2>
<p>Once your DEGIRO portfolio is imported, trefolio gives you:</p>
<ul>
<li><strong>Real-time dashboard</strong> — total value, daily change, per-stock breakdowns</li>
<li><strong>Performance metrics</strong> — TTWROR and IRR calculated from your actual transaction history</li>
<li><strong>Dividend tracking</strong> — estimated annual income, per-stock yields, 5-year projections</li>
<li><strong>AI analysis</strong> — ask AI about any stock in your portfolio (5 free calls/month)</li>
<li><strong>Growth projections</strong> — see where your portfolio could be in 5, 10, or 20 years</li>
<li><strong>Benchmark comparison</strong> — compare against S&P 500, Nasdaq, Euro Stoxx 50</li>
</ul>

<h2>Updating Your Portfolio</h2>
<p>When you make new trades on DEGIRO, simply re-export your Account CSV and import it again. trefolio detects duplicates automatically — only new transactions are added.</p>

<h2>Common Questions</h2>
<h3>What if my CSV has a different format?</h3>
<p>DEGIRO's Account CSV format is standardized across all European regions. If you're using a different export (like the Portfolio export), switch to the Account export — it contains the full transaction history that trefolio needs.</p>

<h3>Can I import from multiple DEGIRO accounts?</h3>
<p>Yes. Import each CSV separately and trefolio will combine them into a single portfolio view.</p>

<h3>What about fractional shares?</h3>
<p>Fully supported. trefolio handles fractional quantities from DEGIRO correctly.</p>

<p><a href="https://trefolio.com/signup">Import your DEGIRO portfolio now</a> — it takes less than 2 minutes.</p>
`,
});

registerPost({
  slug: "how-to-import-interactive-brokers",
  title: "How to Import Interactive Brokers Trades into trefolio",
  description:
    "Two ways to import your IBKR portfolio: direct API connection or CSV upload. Step-by-step instructions for both methods.",
  date: "2026-03-07",
  readingTime: "6 min read",
  keywords: [
    "interactive brokers portfolio import",
    "ibkr csv import",
    "interactive brokers api",
    "ibkr activity statement",
    "ibkr flex query import",
  ],
  content: /* html */ `
<h2>Two Ways to Import from Interactive Brokers</h2>
<p>Interactive Brokers is the broker of choice for serious European investors. trefolio supports two import methods: <strong>direct API connection</strong> (Trefolio) and <strong>CSV upload</strong> (all tiers). The API method syncs your portfolio automatically; the CSV method works with any IBKR account.</p>

<h2>Method 1: IBKR API (Recommended for Trefolio Users)</h2>
<p>The API connection lets you sync your portfolio with a single click — no file exports needed.</p>

<h3>Setup (One Time)</h3>
<ol>
<li>Go to the <strong>Import</strong> page in trefolio and select <strong>IBKR API</strong>.</li>
<li>Follow the 3-step wizard to configure your IBKR Client Portal API access.</li>
<li>Enter your IBKR credentials when prompted to authorize the connection.</li>
<li>trefolio fetches your positions, trades, and dividends automatically.</li>
</ol>

<h3>Re-Syncing</h3>
<p>After the initial setup, return to the Import page and click <strong>Re-sync</strong> to pull your latest transactions. No re-authorization needed.</p>

<h2>Method 2: CSV Upload (All Tiers)</h2>
<p>If you prefer not to use the API, or if you're on the Folio tier, you can import via CSV. IBKR supports two CSV formats — both work with trefolio.</p>

<h3>Option A: Activity Statement</h3>
<ol>
<li>Log in to <strong>Client Portal</strong> at interactivebrokers.com.</li>
<li>Go to <strong>Performance & Reports</strong> → <strong>Statements</strong>.</li>
<li>Click <strong>Activity</strong> and set your date range.</li>
<li>Choose <strong>CSV</strong> format and click <strong>Run</strong>.</li>
<li>Download the file.</li>
</ol>

<h3>Option B: Flex Query (More Control)</h3>
<ol>
<li>In Client Portal, go to <strong>Performance & Reports</strong> → <strong>Flex Queries</strong>.</li>
<li>Create a new Flex Query or use an existing one. Include at minimum: Trades, Dividends, and Withholding Tax sections.</li>
<li>Run the query with your desired date range.</li>
<li>Download as CSV.</li>
</ol>

<h3>Uploading to trefolio</h3>
<ol>
<li>Go to the <strong>Import</strong> page in trefolio.</li>
<li>Select <strong>IBKR CSV</strong>.</li>
<li>Drag and drop your Activity Statement or Flex Query CSV.</li>
<li>Review the parsed transactions and click <strong>Import All</strong>.</li>
</ol>

<h2>What Gets Imported?</h2>
<ul>
<li><strong>Stock and ETF trades</strong> — buys and sells with exact prices and dates</li>
<li><strong>Dividends</strong> — cash dividends and dividend reinvestments</li>
<li><strong>Withholding taxes</strong> — foreign tax withheld on dividends</li>
<li><strong>Commissions</strong> — IBKR trading fees</li>
<li><strong>Multi-currency transactions</strong> — USD, EUR, GBP, and more</li>
</ul>

<h2>Tips for IBKR Users</h2>
<ul>
<li><strong>Use the longest date range possible</strong> when exporting — trefolio needs your full history for accurate performance metrics (TTWROR, IRR).</li>
<li><strong>API is the easiest</strong> — once set up, syncing takes one click and captures everything automatically.</li>
<li><strong>Flex Queries give you the most control</strong> — useful if you want to include or exclude specific transaction types.</li>
<li><strong>Duplicate detection is automatic</strong> — re-importing the same CSV or re-syncing via API won't create duplicate entries.</li>
</ul>

<h2>After Import</h2>
<p>Your IBKR portfolio joins any existing holdings in trefolio. If you also have a DEGIRO or Trading 212 account, import those too — trefolio aggregates everything into a single dashboard with consolidated performance metrics.</p>

<p><a href="https://trefolio.com/signup">Start importing your IBKR portfolio</a> — free for up to 15 holdings.</p>
`,
});

registerPost({
  slug: "free-vs-paid-portfolio-trackers",
  title: "Free vs Paid Portfolio Trackers: What You Actually Need",
  description:
    "When is a free tracker enough, and when does paying for Trefolio features make sense? A practical breakdown for European investors.",
  date: "2026-03-06",
  readingTime: "6 min read",
  keywords: [
    "free portfolio tracker",
    "paid portfolio tracker",
    "portfolio tracker comparison",
    "is portfolio tracker worth paying",
    "best free stock tracker",
  ],
  content: /* html */ `
<h2>The Free Tracker Is Good Enough for Most People</h2>
<p>If you hold a handful of stocks or ETFs and just want to see your total value and daily changes, a free tracker covers it. You don't need fundamentals, AI analysis, or institutional data to know that your S&P 500 ETF is up 2% today.</p>
<p>Free tiers typically give you: real-time quotes, basic charting, portfolio value tracking, and simple performance metrics. For a buy-and-hold investor with under 15 positions, this is usually all you need.</p>

<h2>When Free Stops Being Enough</h2>
<p>The limitations start to bite as your portfolio grows or your questions get more specific. Here's when free trackers typically fall short:</p>

<h3>1. More Than 15 Holdings</h3>
<p>Most free tiers cap the number of holdings you can track. If you own individual stocks across multiple sectors plus some ETFs, you'll hit this limit quickly. Paid plans remove the cap.</p>

<h3>2. You Want to Understand Why a Stock Moves</h3>
<p>Free trackers show price changes but not the context behind them. Company fundamentals (income statements, balance sheets, cash flow), insider trading data, and institutional holdings help you understand whether a price drop is a buying opportunity or a warning sign.</p>

<h3>3. Dividend Investors Who Want Projections</h3>
<p>If dividend income is part of your strategy, you need more than just a list of past payments. Yield projections, growth estimates, and tax impact calculations require data that free tiers rarely include.</p>

<h3>4. Multiple Brokers, Multiple Currencies</h3>
<p>European investors often hold positions across 2-3 brokers and deal with EUR, USD, GBP, and other currencies. Free tools handle this poorly — you end up with separate views and manual currency conversion.</p>

<h3>5. You Want AI-Powered Analysis</h3>
<p>AI can summarize a stock's fundamentals, analyze news sentiment, and review your entire portfolio for diversification issues — all in plain language. This is a paid feature everywhere, but the time it saves is significant.</p>

<h2>What Paid Plans Typically Include</h2>
<table>
<thead>
<tr><th>Feature</th><th>Folio (Free)</th><th>Paid (e.g. Trefolio)</th></tr>
</thead>
<tbody>
<tr><td>Holdings limit</td><td>10–15</td><td>Unlimited</td></tr>
<tr><td>Real-time quotes</td><td>Yes</td><td>Yes (+ premium data)</td></tr>
<tr><td>Broker import</td><td>Yes</td><td>Yes (+ API sync)</td></tr>
<tr><td>Company fundamentals</td><td>No</td><td>Income, balance, cash flow</td></tr>
<tr><td>News sentiment</td><td>No</td><td>Bullish/bearish analysis</td></tr>
<tr><td>AI analysis</td><td>Limited (5/month)</td><td>Unlimited</td></tr>
<tr><td>Price alerts</td><td>2 (in-app)</td><td>Unlimited + email</td></tr>
<tr><td>CSV export</td><td>No</td><td>Yes</td></tr>
<tr><td>Economic indicators</td><td>No</td><td>GDP, inflation, rates</td></tr>
</tbody>
</table>

<h2>The Cost Question</h2>
<p>At €7.99/month (or €59.99/year), a Trefolio subscription costs less than a single stock trade commission at most European brokers. If AI analysis helps you avoid one bad trade or discover one undervalued stock per year, it pays for itself many times over.</p>
<p>That said, if you're a passive index investor with 3 ETFs — save your money. The Folio tier is built for you.</p>

<h2>Our Recommendation</h2>
<p>Start free. Most portfolio trackers (including <a href="https://trefolio.com/signup">trefolio</a>) let you try the full experience without a credit card. Import your portfolio, use the free AI calls, and see if the limits matter to you. If they do, upgrading is one click.</p>
<p>The worst approach is tracking everything in a spreadsheet because "it's free" — then spending 3 hours every month updating formulas. Your time has value too.</p>
`,
});

registerPost({
  slug: "ai-portfolio-analysis-explained",
  title: "AI Portfolio Analysis: What It Is and Why It Matters",
  description:
    "How AI-powered analysis works for stock portfolios, what questions it can answer, and how European investors can use it practically.",
  date: "2026-03-05",
  readingTime: "7 min read",
  keywords: [
    "ai portfolio analysis",
    "ai stock analysis",
    "ai investment analysis",
    "portfolio review ai",
    "ai for investors",
  ],
  content: /* html */ `
<h2>What Is AI Portfolio Analysis?</h2>
<p>AI portfolio analysis uses large language models (like GPT) combined with financial data to give you plain-language insights about your investments. Instead of staring at numbers and trying to interpret them, you ask a question and get a clear, contextual answer.</p>
<p>This isn't algorithmic trading or robo-advising. AI analysis is an <strong>information layer</strong> — it helps you understand your portfolio better so you can make your own informed decisions.</p>

<h2>What Can AI Tell You About Your Portfolio?</h2>

<h3>Individual Stock Analysis</h3>
<p>Ask AI about any stock in your portfolio and get a summary that covers:</p>
<ul>
<li><strong>Business overview</strong> — what the company does, its market position, competitive advantages</li>
<li><strong>Financial health</strong> — revenue growth, profit margins, debt levels, cash flow trends</li>
<li><strong>Valuation</strong> — whether the stock looks cheap or expensive relative to earnings and peers</li>
<li><strong>Risk factors</strong> — industry headwinds, regulatory concerns, concentration risks</li>
<li><strong>Dividend sustainability</strong> — payout ratio, dividend growth history, coverage by free cash flow</li>
</ul>

<h3>Portfolio-Level Review</h3>
<p>AI can look at your entire portfolio and identify:</p>
<ul>
<li><strong>Diversification gaps</strong> — too much in one sector, country, or currency?</li>
<li><strong>Risk concentration</strong> — what percentage of your portfolio depends on a single stock?</li>
<li><strong>Income quality</strong> — are your dividends well-covered and growing?</li>
<li><strong>Improvement suggestions</strong> — areas where you might consider rebalancing</li>
</ul>

<h3>News Sentiment</h3>
<p>AI reads recent news about your holdings and classifies sentiment as bullish, bearish, or neutral — with explanations. This saves you from scanning dozens of articles daily.</p>

<h2>How It Works in Practice</h2>
<p>In trefolio, AI analysis is integrated directly into the dashboard. You can:</p>
<ol>
<li><strong>Click on any stock</strong> and select "AI Analysis" for a detailed fundamental review</li>
<li><strong>Run a Portfolio Review</strong> from the AI tab to get a full-portfolio health check</li>
<li><strong>Check news sentiment</strong> in the Stock Intelligence section to see bullish/bearish signals</li>
</ol>
<p>Everything is in your chosen language — trefolio's AI responds in all 35 supported European languages.</p>

<h2>What AI Cannot Do</h2>
<p>It's important to be clear about limitations:</p>
<ul>
<li><strong>AI doesn't predict the future</strong> — no model can reliably forecast stock prices</li>
<li><strong>It's not financial advice</strong> — AI provides information, not recommendations to buy or sell</li>
<li><strong>Data has a lag</strong> — fundamental data updates quarterly, not in real-time</li>
<li><strong>It can make mistakes</strong> — always verify critical information before acting on it</li>
</ul>
<p>Think of AI as a research assistant that reads financial reports faster than you can. It synthesizes information — you make the decisions.</p>

<h2>Who Benefits Most?</h2>
<p><strong>Beginner investors</strong> benefit enormously. If you don't know how to read a balance sheet or calculate a P/E ratio, AI explains it in plain language. It bridges the knowledge gap without requiring you to take a finance course.</p>
<p><strong>Busy investors</strong> who don't have time to research every holding benefit too. A 30-second AI summary of a stock covers what would take 20 minutes of manual research.</p>
<p><strong>Non-English speakers</strong> benefit from AI that responds in their native language. Financial analysis in Bulgarian, Finnish, or Portuguese — without translation artifacts — makes the information genuinely accessible.</p>

<h2>The Cost of AI Analysis</h2>
<p>AI analysis requires computational resources (running large language models isn't cheap), which is why most platforms limit or charge for it. In trefolio:</p>
<ul>
<li><strong>Folio tier:</strong> 5 AI calls per month — enough to try it out</li>
<li><strong>Trefolio tier:</strong> 30 AI calls per day — enough for daily portfolio monitoring</li>
</ul>
<p>The Folio tier lets you experience AI analysis before committing. If you find it useful, Trefolio removes the limits.</p>

<h2>Try It With Your Portfolio</h2>
<p>The best way to evaluate AI analysis is to use it with your actual holdings. <a href="https://trefolio.com/signup">Create a free trefolio account</a>, import your portfolio, and run your first AI analysis. You get 5 free calls to see if it adds value to your investment process.</p>
`,
});

registerPost({
  slug: "stock-tax-reports-17-countries",
  title: "Stock Tax Reports for Investors in 17 Countries: From Anlage KAP to Modelo 100",
  description:
    "trefolio generates country-specific stock tax reports for 17 countries — Germany, France, Spain, Netherlands, Italy, UK, US, and 10 more. Form mappings, AI tax assistant, and CSV export included.",
  date: "2026-03-13",
  readingTime: "10 min read",
  keywords: [
    "stock tax report europe",
    "capital gains tax Germany",
    "Anlage KAP",
    "Modelo 100",
    "Box 3 Netherlands",
    "stock tax UK",
    "capital gains tax US",
  ],
  image: "/screenshots/tools-page.png",
  content: /* html */ `
<h2>The Tax Filing Problem for International Investors</h2>
<p>If you hold stocks across multiple countries or brokers, tax season becomes a nightmare. Each jurisdiction has its own forms, rules, and deadlines. Germany wants Anlage KAP. Spain wants Modelo 100. The Netherlands has Box 3. The UK has CGT returns. And if you're a US expat or hold US securities, Schedule D adds another layer. Manually compiling this from broker statements is error-prone and time-consuming.</p>
<p>trefolio solves this by generating country-specific stock tax reports for 17 countries — all from your imported portfolio data. No spreadsheets, no manual calculations, no guessing which form goes where.</p>

<h2>17 Countries, One Tax Report Tool</h2>
<p>trefolio maps your holdings and transactions to the correct tax forms and rules for each country:</p>

<h3>Germany</h3>
<p><strong>Anlage KAP</strong> — capital gains and dividends. trefolio calculates Vorabpauschale (advance lump-sum tax on ETFs), Sparerpauschbetrag (€1,000 single / €2,000 joint allowance), and separates Veräußerungsgewinne from dividend income.</p>

<h3>France</h3>
<p><strong>Déclaration 2074</strong> — PEA and CTO accounts. PFU (flat tax) at 30% or progressive scale. trefolio handles both regimes and separates French vs. foreign source income.</p>

<h3>Spain</h3>
<p><strong>Modelo 100</strong> — income tax return with capital gains and dividends. trefolio supports Modelo 720 for foreign asset reporting and applies wash sale rules where applicable.</p>

<h3>Netherlands</h3>
<p><strong>Box 3</strong> — wealth tax on deemed returns. trefolio calculates your taxable base from stocks, ETFs, and cash, applying the correct rates and thresholds.</p>

<h3>Italy</h3>
<p><strong>Quadro RT-RW</strong> — capital gains and foreign investments. IVAFE (tax on foreign securities) and LIFO cost basis for Italian tax purposes.</p>

<h3>United Kingdom</h3>
<p><strong>CGT (Capital Gains Tax)</strong> — trefolio computes gains/losses with correct cost basis, annual exempt amount, and reporting thresholds.</p>

<h3>United States</h3>
<p><strong>Schedule D</strong> — capital gains and losses. trefolio supports short-term vs. long-term classification and wash sale adjustments.</p>

<h3>Switzerland</h3>
<p><strong>Verrechnungssteuer</strong> — withholding tax on dividends. trefolio tracks reclaimable amounts for Swiss residents.</p>

<h3>Austria</h3>
<p><strong>KESt (Kapitalertragsteuer)</strong> — 27.5% on dividends and capital gains. trefolio handles the Austrian exemption thresholds.</p>

<h3>Portugal</h3>
<p><strong>IRS Anexo J</strong> — capital gains and dividends. trefolio maps to Portuguese tax categories.</p>

<h3>Belgium</h3>
<p><strong>TOB (Taxe sur les Opérations de Bourse)</strong> — transaction tax. trefolio includes transaction costs in your report.</p>

<h3>Ireland</h3>
<p><strong>CGT at 33%</strong> — trefolio calculates gains with Irish rules and annual exemption.</p>

<h3>Sweden</h3>
<p><strong>K4 (Declaration)</strong> — capital income from securities. trefolio supports ISK (investment savings account) and traditional account reporting.</p>

<h3>Denmark</h3>
<p><strong>Aktieindkomst</strong> — stock income taxation. trefolio applies Danish rules for gains and dividends.</p>

<h3>Norway</h3>
<p><strong>RF-1159</strong> — capital gains and dividends. trefolio calculates according to Norwegian tax law.</p>

<h3>Finland</h3>
<p><strong>Capital income</strong> — 30% on capital gains and dividends. trefolio maps to Finnish tax reporting.</p>

<h3>Poland</h3>
<p><strong>PIT-38</strong> — capital gains tax return. trefolio supports Polish tax reporting.</p>

<h2>How to Generate Your Tax Report</h2>
<ol>
<li>Import your portfolio from DEGIRO, IBKR, Trading 212, or Revolut — or add holdings manually.</li>
<li>Go to <strong>Tools</strong> → <strong>Tax Report</strong> in trefolio.</li>
<li>Select your country from the dropdown.</li>
<li>Choose the tax year and review the generated summary.</li>
<li>Download your report as PDF or CSV for your accountant.</li>
</ol>
<p><img src="/screenshots/tools-page.png" alt="trefolio Tools page with Tax Report" width="800" height="450" /></p>

<h2>AI Tax Assistant</h2>
<p>Not sure which form applies or how to report a specific transaction? trefolio's AI tax assistant answers questions in plain language. Ask about wash sales, cost basis methods, or foreign tax credits — get clear, country-specific guidance without digging through tax manuals.</p>

<h2>CSV Export for Your Accountant</h2>
<p>Accountants prefer raw data. trefolio exports your transactions as CSV with all fields needed for tax preparation: date, symbol, quantity, cost basis, proceeds, gain/loss, dividend amount, withholding tax, and currency. Hand it to your Steuerberater, comptable, or CPA — they'll have everything they need.</p>

<h2>Get Started with Tax Reports</h2>
<p>Stop wrestling with broker statements and tax forms. <a href="https://trefolio.com/signup">Create a free trefolio account</a> — no credit card required. Import your portfolio from any supported broker and generate your first country-specific tax report in minutes. The free Folio tier includes tax reports for up to 15 holdings; upgrade to Trefolio for unlimited holdings and full CSV export.</p>
`,
});

registerPost({
  slug: "dividend-tracking-projections-european-investors",
  title: "Track Dividends Like a Pro: Income Tracking, Projections & Ex-Dividend Calendar",
  description:
    "Track dividend income, project future payouts, and never miss an ex-dividend date. trefolio handles withholding tax across European brokers automatically.",
  date: "2026-03-13",
  readingTime: "7 min read",
  keywords: [
    "dividend tracker",
    "dividend income projections",
    "ex-dividend calendar",
    "dividend portfolio tracker",
    "dividend withholding tax Europe",
  ],
  image: "/screenshots/dividends.png",
  content: /* html */ `
<h2>Why Dividends Matter for European Investors</h2>
<p>Dividends are a core part of many European investment strategies. Whether you're building passive income, reinvesting for growth, or simply holding quality companies that pay shareholders, you need to know exactly what you're earning — and when. Yet most portfolio trackers treat dividends as an afterthought: a line item in your transaction history, nothing more.</p>
<p>trefolio treats dividends as a first-class feature. From per-stock yield and payout ratios to 5-year income projections and an ex-dividend calendar, you get the full picture without spreadsheets.</p>

<h2>What trefolio Tracks</h2>
<p>For every holding in your portfolio, trefolio calculates:</p>
<ul>
<li><strong>Dividend per share (DPS)</strong> — trailing 12-month and forward estimates</li>
<li><strong>Dividend yield</strong> — current yield based on your cost basis and market price</li>
<li><strong>Payout ratio</strong> — how much of earnings the company pays out as dividends</li>
<li><strong>Estimated annual income</strong> — projected dividends for the next 12 months based on your shares</li>
<li><strong>Withholding tax</strong> — automatically parsed from broker imports (DEGIRO, IBKR, Trading 212, Revolut)</li>
</ul>
<p><img src="/screenshots/dividends.png" alt="trefolio dividend tracking dashboard" width="800" height="450" /></p>

<h2>Ex-Dividend Calendar</h2>
<p>Never miss an ex-dividend date again. trefolio shows a calendar of upcoming ex-dividend dates for all your holdings. Plan your buys: if you want to capture the next dividend, you need to own the stock before the ex-date. Plan your sells: selling after the ex-date means you still receive the dividend. The calendar keeps you informed so you're never caught off guard.</p>

<h2>Withholding Tax Handling</h2>
<p>European investors face a patchwork of withholding taxes. US dividends are subject to 15% or 30% withholding. Irish-domiciled ETFs may have different treatment. trefolio parses withholding tax from your broker statements automatically — no manual entry. You see net dividends received and can reconcile with your tax report for reclaims or foreign tax credits.</p>

<h2>5-Year Dividend Projections</h2>
<p>How much dividend income can you expect over the next 5 years? trefolio projects forward based on current DPS, historical growth rates, and your share count. Use it to plan cash flow, set income goals, or compare dividend stocks side by side.</p>

<h2>Step-by-Step: Setting Up Dividend Tracking</h2>
<ol>
<li>Import your portfolio from your broker (DEGIRO, IBKR, Trading 212, or Revolut) or add holdings manually.</li>
<li>Navigate to the <strong>Dividends</strong> section in trefolio.</li>
<li>Review your estimated annual income and per-stock yields.</li>
<li>Check the ex-dividend calendar for upcoming dates.</li>
<li>Use the 5-year projection to model your income trajectory.</li>
</ol>

<h2>Get Started</h2>
<p><a href="https://trefolio.com/signup">Create a free trefolio account</a> — no credit card required. Import your portfolio and start tracking dividends immediately. The free Folio tier includes dividend tracking, ex-dividend calendar, and 5-year projections for up to 15 holdings. Upgrade to Trefolio for unlimited holdings and advanced dividend analytics.</p>
`,
});

registerPost({
  slug: "portfolio-simulator-backtesting-what-if",
  title: "Portfolio Simulator: Backtest Strategies, Run What-If Scenarios & Stress Test Your Portfolio",
  description:
    "Backtest DCA strategies over 30 years, simulate what-if scenarios, and stress test against 5 historical crises. CAGR, Sharpe ratio, and max drawdown included.",
  date: "2026-03-13",
  readingTime: "8 min read",
  keywords: [
    "portfolio backtesting tool",
    "what-if portfolio simulator",
    "stress test portfolio",
    "DCA simulator",
    "portfolio backtest",
  ],
  image: "/screenshots/tools-page.png",
  content: /* html */ `
<h2>"What If I Had Invested Differently?"</h2>
<p>Every investor has wondered: what if I had started earlier? What if I had put more into that ETF? What if I had diversified differently? Hindsight is 20/20, but you don't need a time machine to learn from the past. trefolio's portfolio simulator lets you backtest strategies, run what-if scenarios, and stress test your portfolio against real historical crises — all with a few clicks.</p>

<h2>Three Modes, One Tool</h2>

<h3>1. Historical Backtesting</h3>
<p>Backtest dollar-cost averaging (DCA) strategies over up to 30 years. Pick a ticker (e.g., S&P 500 ETF, Euro Stoxx 50), set your monthly contribution, choose your start date, and see how your portfolio would have grown. trefolio calculates CAGR, Sharpe ratio, max drawdown, and total dividend income over the period. No coding required — just configure and run.</p>

<h3>2. What-If Scenarios</h3>
<p>What if you had allocated 50% to tech instead of 20%? What if you had held more cash during the 2022 rate hike? trefolio's what-if mode lets you adjust sector weights, add or remove positions, and see how your portfolio would have performed. Sector concentration analysis helps you understand diversification impact before you make changes.</p>

<h3>3. Crisis Stress Testing</h3>
<p>How would your portfolio have held up during the 2008 financial crisis? COVID-19? The dot-com crash? trefolio stress tests against 5 historical crises:</p>
<ul>
<li><strong>2008 Global Financial Crisis</strong> — Lehman collapse, bank failures, market crash</li>
<li><strong>COVID-19 (2020)</strong> — rapid sell-off and V-shaped recovery</li>
<li><strong>Dot-Com Bubble (2000–2002)</strong> — tech collapse and prolonged bear market</li>
<li><strong>2022 Rate Hike</strong> — inflation shock and bond/equity drawdowns</li>
<li><strong>Euro Debt Crisis (2011–2012)</strong> — sovereign stress and European equity sell-off</li>
</ul>
<p>See your max drawdown, recovery time, and how your allocation would have fared. Knowledge is power — and preparation.</p>

<h2>Metrics You Get</h2>
<ul>
<li><strong>CAGR (Compound Annual Growth Rate)</strong> — your annualized return over the period</li>
<li><strong>Sharpe ratio</strong> — risk-adjusted return (higher is better)</li>
<li><strong>Max drawdown</strong> — largest peak-to-trough decline</li>
<li><strong>Dividend income</strong> — total dividends received over the backtest period</li>
</ul>
<p><img src="/screenshots/tools-page.png" alt="trefolio Tools page with Portfolio Simulator" width="800" height="450" /></p>

<h2>Step-by-Step: Running Your First Backtest</h2>
<ol>
<li>Go to <strong>Tools</strong> → <strong>Portfolio Simulator</strong> in trefolio.</li>
<li>Choose <strong>Historical Backtest</strong>, <strong>What-If</strong>, or <strong>Stress Test</strong>.</li>
<li>For backtest: select ticker, monthly amount, start date, and run.</li>
<li>For what-if: adjust your portfolio weights and compare results.</li>
<li>For stress test: select a crisis and see your portfolio's hypothetical performance.</li>
</ol>

<h2>Get Started</h2>
<p><a href="https://trefolio.com/signup">Create a free trefolio account</a> — no credit card required. The portfolio simulator is available on the free Folio tier. Run backtests, what-if scenarios, and stress tests with your real portfolio data. Upgrade to Trefolio for unlimited simulations and advanced analytics.</p>
`,
});

registerPost({
  slug: "stock-screener-european-exchanges",
  title: "Stock Screener for European Exchanges: Filter 600+ Stocks by Yield, P/E & Sector",
  description:
    "Screen 600+ stocks on European exchanges by dividend yield, P/E ratio, sector, market cap, and country. Preset filters and direct portfolio integration.",
  date: "2026-03-13",
  readingTime: "6 min read",
  keywords: [
    "stock screener Europe",
    "European stock screener",
    "filter stocks dividend yield",
    "stock screener XETRA",
    "best stock screener 2026",
  ],
  image: "/screenshots/tools-page.png",
  content: /* html */ `
<h2>Why European Stock Screening Is Hard</h2>
<p>US investors have dozens of screeners — Yahoo Finance, Finviz, TradingView — with deep coverage of NYSE and Nasdaq. European investors? Not so much. XETRA, Euronext, LSE, SIX Swiss, and Nordic exchanges have thousands of listed companies, but finding a screener that covers them well, with dividend yield, P/E, and sector filters, is surprisingly difficult. Most tools are US-centric or require expensive subscriptions.</p>
<p>trefolio's stock screener covers 600+ stocks across major European exchanges. Filter by dividend yield, P/E ratio, sector, market cap, exchange, and country — then add winners directly to your portfolio with one click.</p>

<h2>What You Can Filter</h2>
<ul>
<li><strong>Dividend yield</strong> — find high-yield dividend stocks (e.g., yield &gt; 4%)</li>
<li><strong>P/E ratio</strong> — screen for value (low P/E) or growth (higher P/E)</li>
<li><strong>Sector</strong> — technology, healthcare, financials, consumer goods, energy, and more</li>
<li><strong>Market cap</strong> — large-cap, mid-cap, small-cap</li>
<li><strong>Exchange</strong> — XETRA, Euronext Paris/Amsterdam, LSE, SIX Swiss, Oslo, Stockholm, Helsinki, and others</li>
<li><strong>Country</strong> — filter by company domicile or primary listing</li>
</ul>
<p><img src="/screenshots/tools-page.png" alt="trefolio stock screener" width="800" height="450" /></p>

<h2>Preset Filters</h2>
<p>Don't want to build filters from scratch? trefolio includes preset filters for common strategies:</p>
<ul>
<li><strong>High dividend yield</strong> — stocks with yield above 4%</li>
<li><strong>Value stocks</strong> — low P/E, solid fundamentals</li>
<li><strong>Large-cap stability</strong> — blue chips on major exchanges</li>
<li><strong>European tech</strong> — technology sector on European exchanges</li>
</ul>
<p>One click applies the preset; adjust as needed.</p>

<h2>Adding Directly to Your Portfolio</h2>
<p>Found a stock you like? Add it to your portfolio with one click. No need to switch apps or manually enter tickers. trefolio's screener is integrated with your portfolio — screen, add, and track in one place.</p>

<h2>Step-by-Step: Using the Stock Screener</h2>
<ol>
<li>Go to <strong>Tools</strong> → <strong>Stock Screener</strong> in trefolio.</li>
<li>Set your filters: yield, P/E, sector, cap, exchange, country.</li>
<li>Or choose a preset filter and refine.</li>
<li>Browse results and click <strong>Add to Portfolio</strong> on any stock.</li>
<li>Your new holding appears on your dashboard with real-time quotes.</li>
</ol>

<h2>Get Started</h2>
<p><a href="https://trefolio.com/signup">Create a free trefolio account</a> — no credit card required. The stock screener is available on the free Folio tier. Screen 600+ European stocks, apply filters, and add holdings directly to your portfolio. Upgrade to Trefolio for unlimited holdings and advanced screening criteria.</p>
`,
});

registerPost({
  slug: "portfolio-performance-metrics-ttwror-irr",
  title: "Portfolio Performance: TTWROR, IRR, Sharpe Ratio & Benchmark Comparison Explained",
  description:
    "Understand TTWROR, IRR, Sharpe ratio, max drawdown, and volatility. Learn how trefolio calculates real performance and compares against S&P 500 and Euro Stoxx 50.",
  date: "2026-03-13",
  readingTime: "9 min read",
  keywords: [
    "TTWROR explained",
    "IRR portfolio",
    "Sharpe ratio portfolio",
    "portfolio benchmark comparison",
    "portfolio performance metrics",
  ],
  image: "/screenshots/tools-page.png",
  content: /* html */ `
<h2>"Am I Actually Beating the Market?"</h2>
<p>Your portfolio is up 15% this year. Sounds great — but is it? If the S&P 500 returned 25%, you underperformed. If you added cash mid-year, your "return" might be distorted by the timing of deposits. And what about risk? A 15% return with 30% volatility is very different from 15% with 5% volatility.</p>
<p>Understanding portfolio performance requires the right metrics. trefolio calculates TTWROR, IRR, Sharpe ratio, max drawdown, and volatility from your actual transactions — and compares you against S&P 500, Nasdaq, Dow Jones, and Euro Stoxx 50. No guesswork, no spreadsheets.</p>

<h2>TTWROR Explained</h2>
<p><strong>Time-Weighted Rate of Return (TTWROR)</strong> measures your portfolio's performance independent of when you added or withdrew cash. It answers: "How well did my investments perform?" — not "How much money did I make?"</p>
<p>Why does this matter? If you deposit €10,000 in January and your portfolio doubles by December, your "simple return" is 100%. But if you deposited €50,000 in November, that same 100% gain would look very different. TTWROR eliminates cash flow distortion by breaking the period into sub-periods and chain-linking returns. It's the standard metric used by fund managers and financial advisors.</p>
<p>trefolio calculates TTWROR from your real buy/sell transactions and cash flows. No manual entry — import from DEGIRO, IBKR, Trading 212, or Revolut and get accurate numbers.</p>

<h2>IRR Explained</h2>
<p><strong>Internal Rate of Return (IRR)</strong> is money-weighted. It accounts for the timing and size of your deposits and withdrawals. It answers: "What return did I personally achieve on the money I invested?"</p>
<p>IRR is useful when you want to know your personal outcome — e.g., "I put in €5,000 over 3 years and now have €6,500. What's my effective annual return?" IRR captures that. TTWROR would tell you how the market did; IRR tells you how you did given your specific cash flow pattern.</p>
<p>trefolio computes IRR from your transaction history. Use it alongside TTWROR to get the full picture.</p>

<h2>Sharpe Ratio</h2>
<p><strong>Sharpe ratio</strong> measures risk-adjusted return. It's your excess return (above the risk-free rate) divided by volatility. A higher Sharpe means you're getting more return per unit of risk. A portfolio with 10% return and 5% volatility has a better Sharpe than one with 10% return and 20% volatility.</p>
<p>trefolio calculates Sharpe from your historical returns. Use it to compare strategies or to see if your portfolio is efficiently rewarded for the risk you're taking.</p>

<h2>Max Drawdown</h2>
<p><strong>Max drawdown</strong> is the largest peak-to-trough decline in your portfolio value. If your portfolio went from €100,000 to €70,000 at its lowest point, your max drawdown is 30%. It's a simple, intuitive measure of "how bad did it get?" — and how long it took to recover.</p>

<h2>Volatility</h2>
<p><strong>Volatility</strong> (standard deviation of returns) measures how much your portfolio fluctuates. Low volatility means smooth, predictable returns. High volatility means bigger swings — both up and down. trefolio shows annualized volatility so you can compare across time periods.</p>

<h2>Benchmark Comparison</h2>
<p>Beating the market is the goal for many investors. trefolio compares your TTWROR and IRR against:</p>
<ul>
<li><strong>S&P 500</strong> — US large-cap benchmark</li>
<li><strong>Nasdaq</strong> — US tech-heavy benchmark</li>
<li><strong>Dow Jones</strong> — US blue-chip benchmark</li>
<li><strong>Euro Stoxx 50</strong> — European large-cap benchmark</li>
</ul>
<p>See side-by-side how you're doing vs. passive index investing. Are you adding value, or would you have been better off in an ETF?</p>
<p><img src="/screenshots/tools-page.png" alt="trefolio performance metrics and benchmark comparison" width="800" height="450" /></p>

<h2>How trefolio Calculates From Real Transactions</h2>
<p>trefolio doesn't guess. It uses your actual buy/sell transactions, dividends, and cash flows from your broker import. TTWROR, IRR, Sharpe, and max drawdown are computed from this data — no manual entry, no approximations. Import from DEGIRO, IBKR, Trading 212, or Revolut and get performance metrics that reflect your real investing history.</p>

<h2>Performance Explainer Feature</h2>
<p>Not sure what a metric means or why your return differs from the benchmark? trefolio's performance explainer breaks it down in plain language. Click on any metric to get a short explanation and context. No finance degree required.</p>

<h2>Step-by-Step: Viewing Your Performance</h2>
<ol>
<li>Import your portfolio from your broker.</li>
<li>Go to your dashboard — TTWROR, IRR, and daily change are shown at the top.</li>
<li>Scroll to the <strong>Performance</strong> section for full metrics: Sharpe, max drawdown, volatility.</li>
<li>Check the <strong>Benchmark Comparison</strong> to see how you stack up vs. S&P 500 and Euro Stoxx 50.</li>
<li>Use the performance explainer for any metric you want to understand better.</li>
</ol>

<h2>Get Started</h2>
<p><a href="https://trefolio.com/signup">Create a free trefolio account</a> — no credit card required. Import your portfolio and get accurate TTWROR, IRR, Sharpe ratio, and benchmark comparison from day one. The free Folio tier includes full performance metrics for up to 15 holdings. Upgrade to Trefolio for unlimited holdings and historical performance analytics.</p>
`,
});

registerPost({
  slug: "stock-price-alerts-whatsapp-push-email",
  title: "Stock Price Alerts on WhatsApp, Push & Email: Never Miss a Market Move",
  description:
    "Set stock price alerts delivered via WhatsApp, browser push, or email. Percentage-based triggers and portfolio-wide alerts for European investors.",
  date: "2026-03-13",
  readingTime: "6 min read",
  keywords: [
    "stock price alert WhatsApp",
    "push notification stock price",
    "portfolio alert",
    "price drop alert",
    "stock alert app Europe",
  ],
  image: "/screenshots/dashboard-overview.png",
  content: /* html */ `
<h2>The Cost of Missing a Market Move</h2>
<p>A stock in your portfolio drops 8% in a single session. By the time you check your phone at lunch, it's recovered 3% — and you missed the buying opportunity. Or worse: a position you've been meaning to sell finally hits your target price while you're in a meeting. Minutes later, it retreats. You had the plan. You just didn't have the alert.</p>
<p>trefolio delivers price alerts where you actually see them — WhatsApp, browser push notifications, and email. Set your thresholds once, and trefolio watches the market for you.</p>

<h2>Multi-Channel Alerts: WhatsApp, Push & Email</h2>
<p>Most alert systems are limited to email or in-app notifications — channels you might not check in real time. trefolio supports three channels:</p>
<ul>
<li><strong>WhatsApp</strong> — instant messages to your phone. No app to install, no notifications to miss. This is the fastest way to get alerted during market hours.</li>
<li><strong>Browser push notifications</strong> — alerts pop up on your desktop or mobile even when trefolio isn't open. Works on Chrome, Firefox, Safari, and Edge.</li>
<li><strong>Email</strong> — for a persistent record of every triggered alert. Great for end-of-day review.</li>
</ul>
<p>You can enable one channel or all three. WhatsApp is the standout — most European investors have it open all day, making it the lowest-latency option.</p>

<h2>Percentage-Based Price Triggers</h2>
<p>trefolio supports two types of percentage-based alerts:</p>
<ul>
<li><strong>Daily change</strong> — notify when a stock moves more than X% in a single session (e.g., "Alert me if ASML drops more than 5% today")</li>
<li><strong>Versus purchase price</strong> — notify when a stock moves X% from your cost basis (e.g., "Alert me if my NVIDIA position is up 50% from my average buy price")</li>
</ul>
<p>This is more flexible than fixed price alerts. Percentage-based triggers adjust with the stock's price, so you don't need to recalculate targets manually.</p>

<h2>Portfolio-Wide Alerts</h2>
<p>Don't just monitor individual stocks — monitor your entire portfolio. Set a portfolio-wide alert to notify you when your total portfolio value changes by more than a specified percentage in a day. This catches broad market moves (like index-level sell-offs) without requiring an alert on every single holding.</p>

<h2>Big Market Move Alerts</h2>
<p>trefolio also watches major indices. When the S&P 500, Nasdaq, or Euro Stoxx 50 moves more than 4% in a session, you get an automatic alert — even without setting one. These rare, high-impact moves are the ones that matter most, and trefolio makes sure you know about them.</p>

<h2>Step-by-Step: Setting Up Your First Alert</h2>
<ol>
<li>Go to your <strong>Profile</strong> page and enable your preferred notification channels (WhatsApp, push, email).</li>
<li>Navigate to any stock in your portfolio or watchlist.</li>
<li>Click <strong>Set Alert</strong> and choose your trigger type (daily change or vs. purchase price).</li>
<li>Set your percentage threshold.</li>
<li>Save — trefolio monitors the stock and notifies you when the condition is met.</li>
</ol>

<h2>Get Started</h2>
<p>Stop checking your portfolio every hour. <a href="https://trefolio.com/signup">Create a free trefolio account</a> — no credit card required. The free Folio tier includes 25 price alerts with in-app notifications. Trefolio raises the limit to 500 alerts across WhatsApp, push, and email.</p>
`,
});

registerPost({
  slug: "net-worth-tracker-beyond-stocks",
  title: "Track Your Full Net Worth: Stocks, Real Estate, Savings & Pension in One View",
  description:
    "Go beyond stock tracking. Add real estate, savings accounts, and pension to see your complete net worth with multi-currency support and visual breakdowns.",
  date: "2026-03-13",
  readingTime: "6 min read",
  keywords: [
    "net worth tracker",
    "track net worth stocks real estate",
    "personal finance tracker Europe",
    "net worth calculator",
    "net worth app",
  ],
  image: "/screenshots/dashboard-overview.png",
  content: /* html */ `
<h2>Your Portfolio Is Not Your Net Worth</h2>
<p>You track your stocks obsessively — every dip, every dividend, every daily change. But your stock portfolio is probably just one piece of your financial picture. You have a savings account. Maybe a pension. Perhaps real estate. These assets matter, and ignoring them gives you an incomplete view of where you actually stand.</p>
<p>trefolio's net worth tracking lets you add manual assets alongside your stock portfolio so you can see everything in one place — your true financial position.</p>

<h2>What You Can Track</h2>
<p>trefolio supports four categories of manual assets beyond your stock and ETF portfolio:</p>
<ul>
<li><strong>Real estate</strong> — your primary residence, rental properties, or REITs held outside a brokerage. Enter the current estimated value and trefolio includes it in your net worth.</li>
<li><strong>Savings accounts</strong> — cash in bank accounts, high-yield savings, money market funds. Track multiple accounts across different banks and currencies.</li>
<li><strong>Pension</strong> — employer pension, state pension entitlements, private retirement accounts. Even approximate values help complete the picture.</li>
<li><strong>Other assets</strong> — anything else with monetary value: crypto held in cold storage, collectibles, loans you've made. Optional notes help you remember what each entry represents.</li>
</ul>

<h2>Multi-Currency Support</h2>
<p>European investors often have assets in multiple currencies — a savings account in EUR, a property valued in GBP, a US stock portfolio in USD. trefolio converts everything to your base currency automatically using live exchange rates. Your net worth is always displayed in one number, one currency.</p>

<h2>Net Worth Overview with Visual Breakdown</h2>
<p>The Net Worth Overview card on your dashboard shows your total net worth as a single figure, with a donut chart breaking it down by category: stocks and ETFs, real estate, savings, pension, and other. At a glance, you see how diversified your total wealth is — not just your stock portfolio, but everything.</p>
<p><img src="/screenshots/dashboard-overview.png" alt="trefolio net worth overview" width="800" height="450" /></p>

<h2>Step-by-Step: Adding Manual Assets</h2>
<ol>
<li>From your dashboard, click <strong>Add Asset</strong> in the Net Worth section.</li>
<li>Choose the asset type: real estate, savings, pension, or other.</li>
<li>Enter the value and currency.</li>
<li>Add optional notes (e.g., "Berlin apartment" or "Company pension fund").</li>
<li>Save — the asset appears in your net worth breakdown immediately.</li>
</ol>

<h2>Why This Matters</h2>
<p>If 80% of your net worth is in stocks and 20% in cash, that's a very different risk profile than 40% stocks, 30% real estate, and 30% pension. You can't manage what you can't measure. Net worth tracking gives you the full picture so you can make informed decisions about asset allocation, risk, and financial planning.</p>

<h2>Get Started</h2>
<p>See your full financial picture, not just your stock portfolio. <a href="https://trefolio.com/signup">Create a free trefolio account</a> — no credit card required. The free Folio tier includes net worth tracking with up to 15 holdings and unlimited manual assets. Add your savings, real estate, and pension alongside your stocks and see where you truly stand.</p>
`,
});

registerPost({
  slug: "auto-sync-broker-snaptrade",
  title: "Auto-Sync Your Broker Portfolio: Connect 20+ Brokerages With One Click",
  description:
    "Connect your brokerage account to trefolio via SnapTrade and auto-sync your portfolio every hour. No more CSV exports — just one-click OAuth.",
  date: "2026-03-13",
  readingTime: "6 min read",
  keywords: [
    "auto sync broker portfolio",
    "SnapTrade portfolio tracker",
    "connect broker portfolio app",
    "automatic portfolio sync",
    "broker API portfolio tracker",
  ],
  image: "/screenshots/dashboard-overview.png",
  content: /* html */ `
<h2>The Problem with Manual Imports</h2>
<p>CSV imports work. They're reliable and they get your data into trefolio accurately. But they're also tedious. Every time you make a trade, you need to re-export your CSV, upload it, and wait for the import to process. For active traders making several trades a week, this adds up fast. For passive investors, it's an inconvenience you'd rather not deal with every quarter.</p>
<p>trefolio's broker sync solves this. Connect your brokerage account once via SnapTrade, and your portfolio syncs automatically every hour. No CSV exports, no manual uploads, no missed transactions.</p>

<h2>How Broker Sync Works</h2>
<p>trefolio uses SnapTrade — a secure, regulated broker aggregation platform — to connect directly to your brokerage account. The process is simple:</p>
<ol>
<li>Go to the <strong>Import</strong> page in trefolio and select <strong>Connect Broker</strong>.</li>
<li>Choose your broker from the list of 20+ supported brokerages.</li>
<li>Authenticate via OAuth — you log in to your broker directly. trefolio never sees your broker password.</li>
<li>trefolio pulls your current positions, transaction history, and cash balances.</li>
<li>Your portfolio updates automatically every hour. No action needed.</li>
</ol>
<p><img src="/screenshots/dashboard-overview.png" alt="trefolio broker sync" width="800" height="450" /></p>

<h2>Supported Brokerages</h2>
<p>SnapTrade supports 20+ brokerages commonly used by European and North American investors, including:</p>
<ul>
<li><strong>Interactive Brokers (IBKR)</strong> — the most popular broker for serious European investors</li>
<li><strong>Schwab</strong> — including former TD Ameritrade accounts</li>
<li><strong>Fidelity</strong> — US brokerage with European access</li>
<li><strong>Questrade</strong> — popular Canadian broker</li>
<li><strong>Alpaca</strong> — commission-free API broker</li>
<li><strong>Wealthsimple</strong> — Canadian investing platform</li>
</ul>
<p>The full list is available on the Import page. New brokers are added regularly as SnapTrade expands coverage.</p>

<h2>Sync vs. CSV: When to Use Each</h2>
<table>
<thead>
<tr><th>Feature</th><th>Broker Sync (SnapTrade)</th><th>CSV Import</th></tr>
</thead>
<tbody>
<tr><td>Setup effort</td><td>One-time OAuth</td><td>Export + upload each time</td></tr>
<tr><td>Updates</td><td>Automatic every hour</td><td>Manual</td></tr>
<tr><td>Supported brokers</td><td>20+ (growing)</td><td>14+ (DEGIRO, IBKR, Trading 212, Revolut, etc.)</td></tr>
<tr><td>Historical data</td><td>Depends on broker API</td><td>Full history from CSV</td></tr>
<tr><td>Best for</td><td>Active traders, convenience</td><td>Full history import, unsupported brokers</td></tr>
</tbody>
</table>
<p>You can use both: import your historical CSV first, then enable auto-sync for ongoing updates. trefolio deduplicates automatically.</p>

<h2>Security</h2>
<p>Your broker credentials are handled entirely by SnapTrade via OAuth. trefolio never stores your broker username or password. SnapTrade is a regulated financial data provider with bank-grade encryption. Read-only access means trefolio can see your positions but never place trades or move money.</p>

<h2>Get Started</h2>
<p>Stop exporting CSVs. <a href="https://trefolio.com/signup">Create a free trefolio account</a> — no credit card required. Broker sync is available on every plan — Folio (free) includes 1 broker connection with auto-sync. Upgrade to Trefolio for up to 20 broker connections.</p>
`,
});

registerPost({
  slug: "earnings-calendar-economic-events-investors",
  title: "Earnings Calendar & Economic Events: Stay Ahead of Market-Moving Dates",
  description:
    "Track earnings dates for your holdings, economic events like rate decisions, and upcoming IPOs. Portfolio-aware calendar with month grid and list views.",
  date: "2026-03-13",
  readingTime: "6 min read",
  keywords: [
    "earnings calendar investors",
    "economic events calendar",
    "IPO calendar Europe",
    "stock earnings dates",
    "market events calendar 2026",
  ],
  image: "/screenshots/tools-page.png",
  content: /* html */ `
<h2>Why Earnings Dates Move Markets</h2>
<p>Earnings announcements are the single most impactful events for individual stocks. A company that beats expectations can gap up 10-15% overnight. A miss can wipe out months of gains in minutes. If you own the stock, you need to know when earnings are coming — and what the market expects.</p>
<p>trefolio's event calendar tracks earnings dates, economic events, and IPOs in one view. It's portfolio-aware: your holdings' earnings are highlighted so you never get caught off guard.</p>

<h2>Portfolio-Aware Earnings Calendar</h2>
<p>The most important earnings dates are the ones for stocks you actually own. trefolio highlights your holdings' upcoming earnings with a distinct color in the calendar, so they stand out from the hundreds of other companies reporting that week. At a glance, you see: "ASML reports next Thursday" or "Apple's earnings are in two weeks."</p>
<p>This is not a generic market calendar — it's personalized to your portfolio.</p>

<h2>Economic Events</h2>
<p>Beyond individual company earnings, macro events move markets too. trefolio tracks:</p>
<ul>
<li><strong>Central bank rate decisions</strong> — ECB, Fed, Bank of England. Rate changes affect everything from bond yields to stock valuations.</li>
<li><strong>GDP releases</strong> — quarterly economic growth figures for major economies.</li>
<li><strong>Inflation reports</strong> — CPI and PPI data that influence monetary policy.</li>
<li><strong>Employment data</strong> — non-farm payrolls, unemployment rates.</li>
</ul>
<p>Each event is color-coded by impact level (high, medium, low) so you can focus on what matters most.</p>

<h2>IPO Calendar</h2>
<p>Interested in new listings? trefolio's IPO calendar shows upcoming initial public offerings on European exchanges. See the company name, expected listing date, exchange, and sector. Use it to stay informed about new investment opportunities.</p>

<h2>Two Views: Month Grid & Chronological List</h2>
<p>The calendar offers two ways to browse events:</p>
<ul>
<li><strong>Month grid</strong> — see the full month at a glance with color-coded dots for earnings, economic events, and IPOs. Click any day to see details.</li>
<li><strong>Chronological list</strong> — a scrollable feed of upcoming events sorted by date. Better for scanning the next few weeks quickly.</li>
</ul>
<p><img src="/screenshots/tools-page.png" alt="trefolio event calendar" width="800" height="450" /></p>

<h2>Step-by-Step: Using the Event Calendar</h2>
<ol>
<li>Import your portfolio into trefolio (from DEGIRO, IBKR, Trading 212, Revolut, or manually).</li>
<li>Go to the <strong>Event Calendar</strong> tab from the dashboard.</li>
<li>Your holdings' earnings are highlighted automatically.</li>
<li>Toggle between month grid and list view.</li>
<li>Click any event for details: date, time, consensus estimates (for earnings), and impact level (for economic events).</li>
</ol>

<h2>Get Started</h2>
<p>Know what's coming before the market reacts. <a href="https://trefolio.com/signup">Create a free trefolio account</a> — no credit card required. The free Folio tier includes earnings dates for your holdings. Trefolio unlocks full market earnings, economic events, and the IPO calendar.</p>
`,
});

registerPost({
  slug: "trefolio-leaf-amoled-portfolio-display",
  title: "trefolio Leaf: A Dedicated AMOLED Display for Your Portfolio",
  description:
    "A compact AMOLED device that shows your portfolio value, top holdings, and AI insights at a glance. WiFi connected, OTA updates, and a free year of trefolio Pro.",
  date: "2026-03-13",
  readingTime: "5 min read",
  keywords: [
    "portfolio display device",
    "stock ticker display",
    "trefolio Leaf",
    "AMOLED portfolio tracker device",
    "desk stock display",
  ],
  image: "/screenshots/device-t4s3.png",
  content: /* html */ `
<h2>Your Portfolio, Always Visible</h2>
<p>Checking your portfolio shouldn't require unlocking your phone, opening an app, and waiting for it to load. What if your portfolio value, top holdings, and market status were always visible — sitting on your desk, always on, always up to date?</p>
<p>That's trefolio Leaf: a compact AMOLED display that connects to your trefolio account over WiFi and shows your portfolio data in real time. It's a dedicated financial display for investors who want a glanceable overview without the distractions of a phone or browser.</p>
<p><img src="/screenshots/device-t4s3.png" alt="trefolio Leaf AMOLED display device" width="800" height="450" /></p>

<h2>What the Leaf Shows</h2>
<p>The trefolio Leaf cycles through several screens:</p>
<ul>
<li><strong>Portfolio value</strong> — total value, daily change (amount and percentage), and an intraday sparkline chart</li>
<li><strong>Top holdings</strong> — your largest positions with current price and daily change</li>
<li><strong>AI insights</strong> — a summary of your portfolio's health from trefolio's AI analysis</li>
<li><strong>Market status</strong> — whether major exchanges (NYSE, XETRA, LSE) are open or closed, plus key index movements</li>
</ul>
<p>Each screen is designed for readability at arm's length — large fonts, high-contrast AMOLED colors, and minimal clutter.</p>

<h2>Hardware Specs</h2>
<ul>
<li><strong>Display</strong> — AMOLED, vibrant colors with true blacks. Readable in any lighting condition.</li>
<li><strong>Processor</strong> — ESP32-S3 (LILYGO T4-S3) with WiFi connectivity</li>
<li><strong>Connectivity</strong> — 2.4 GHz WiFi. Connects to your home or office network via a captive portal setup.</li>
<li><strong>Power</strong> — USB-C powered. Sits on your desk next to your monitor.</li>
<li><strong>Updates</strong> — over-the-air (OTA) firmware updates. New features and improvements delivered automatically.</li>
</ul>

<h2>Setup in 3 Minutes</h2>
<ol>
<li><strong>Power on</strong> — plug in the Leaf via USB-C.</li>
<li><strong>Connect to WiFi</strong> — the Leaf creates a WiFi hotspot. Connect from your phone, enter your home WiFi credentials, and it connects automatically.</li>
<li><strong>Link your trefolio account</strong> — scan a QR code or enter a pairing code in trefolio. The Leaf pulls your portfolio data and starts displaying.</li>
</ol>
<p>That's it. No app to install, no Bluetooth pairing, no complex configuration.</p>

<h2>Free Year of trefolio Pro</h2>
<p>Every trefolio Leaf purchase includes a full year of trefolio Pro (Trefolio tier). That means unlimited holdings, AI analysis, tax reports, stock screener, portfolio simulator, and all premium features — included with your device.</p>

<h2>Who Is It For?</h2>
<p>The trefolio Leaf is for investors who want a persistent, distraction-free view of their portfolio:</p>
<ul>
<li><strong>Desk traders</strong> who want a secondary display without giving up screen real estate</li>
<li><strong>Long-term investors</strong> who want a daily glance at their portfolio without opening apps</li>
<li><strong>Gift for investors</strong> — a unique, practical gift for anyone who follows the markets</li>
<li><strong>Home office aesthetic</strong> — a sleek device that adds information to your workspace</li>
</ul>

<h2>Join the Waitlist</h2>
<p>The trefolio Leaf is coming soon. <a href="https://trefolio.com/signup">Create a free trefolio account</a> and join the Leaf waitlist from your profile page. You'll be the first to know when it's available — no credit card required, no commitment. In the meantime, set up your portfolio in trefolio so it's ready to display the moment your Leaf arrives.</p>
`,
});
