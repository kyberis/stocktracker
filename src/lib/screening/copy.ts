/**
 * Copy for the investment screening flow.
 *
 * Kept out of `src/locales/*` on purpose while the feature is flag-gated beta:
 * it is ~150 strings of methodology and metric explanations that would need
 * machine translation across 35 locale files to satisfy the parity test. English
 * is the base, Spanish is complete, every other language falls back to English.
 * When the flag goes to 100% this module moves into `src/locales`.
 */

const en = {
  common: {
    disclaimerShort: "Automated research, not financial advice.",
    aiLabel: "AI-generated — may contain errors",
    back: "Back",
    backHome: "Back to home",
  },
  homeBeta: {
    badge: "Beta",
    title: "Investment screening",
    body: "Turn sector mix into a short researched shortlist — up to 3 screens per week while in beta.",
    cta: "Try screening",
  },
  quota: {
    remaining: "{remaining} of {limit} screens left this week",
    exhausted:
      "You have used your 3 screens for this week. Try again when the weekly limit resets.",
  },
  entry: {
    eyebrow: "Your portfolio today",
    titleOverexposed: "You are overexposed to {sector}",
    titleBalanced: "Your portfolio looks balanced",
    bodyOverexposed:
      "{sector} is {pct} of your portfolio. Above {threshold} a single sector drives your result more than your decisions do.",
    bodyBalanced:
      "No sector is above {threshold}. Concentration looks under control — a good moment to explore new candidates rather than rebalance.",
    bodyEmpty:
      "We could not read sector weights for this portfolio yet. You can still run a screen with your own criteria.",
    breakdownTitle: "Sector distribution",
    badgeOverexposed: "Overexposed",
    badgeUnderweight: "Almost no exposure",
    unclassified: "Unclassified",
    optionsTitle: "What do you want to do?",
    optionsTitleBalanced: "Ready to explore?",
    rebalanceEyebrowPrimary: "Option A · rebalance",
    rebalanceEyebrowSecondary: "Option B · rebalance",
    rebalanceTitle: "Look for candidates that balance the portfolio",
    rebalanceBody:
      "The agent starts out knowing which sectors you are short of and which one to avoid. It will look in {include} and exclude {exclude}.",
    rebalanceBodyNoTarget:
      "The agent starts out knowing which sectors you are short of. It will look in {include}.",
    rebalanceBodyBalanced:
      "Nothing is overexposed. If you still want to tilt the mix, the agent can look in {include} without excluding a sector.",
    rebalanceBodyBalancedNone:
      "Nothing is overexposed. You can still ask the agent to hunt for candidates that gently tilt the mix, with no forced exclusion.",
    rebalanceCta: "Balance the portfolio",
    chipInclude: "Include {sector}",
    chipExclude: "Exclude {sector}",
    exploreEyebrowPrimary: "Option A · explore",
    exploreEyebrowSecondary: "Option B · explore",
    exploreTitle: "Screener for new opportunities",
    exploreBody:
      "No sector restriction. The agent asks everything from scratch: size, valuation, balance sheet quality, growth and region.",
    exploreCta: "Find opportunities",
    exploreChipNeutral: "No sector bias",
    exploreChipPreset: "“My screen” preset available",
    analyzeEyebrow: "Option C · analyze",
    analyzeTitle: "Deep-dive one company",
    analyzeBody:
      "Type a ticker or company name. We resolve the listing (and exchange) first, then run the research agents on that name alone.",
    analyzeCta: "Analyze a company",
    analyzeChipSearch: "Ticker or name",
    analyzeChipExchange: "Exchange confirmed",
    discoveryEyebrow: "Investment screening",
    discoveryTitle: "Screen candidates for your portfolio",
    discoveryBody:
      "Start from your sector mix: rebalance if something is heavy, explore freely, or deep-dive a single company.",
    discoveryCta: "Open screening",
    recentScreens: {
      title: "Your recent screens",
      empty: "No screens yet. Start one above — it will show up here.",
      statusQueued: "Queued",
      statusRunning: "In progress",
      statusCompleted: "Completed",
      statusFailed: "Failed",
      viewReport: "View report",
      viewProgress: "View progress",
      intentRebalance: "Rebalance",
      intentExplore: "Explore",
      intentAnalyze: "Analyze",
    },
  },
  methodology: {
    title: "trefolio methodology",
    intro:
      "Every search uses the same frame: five pillars scored deterministically (0–{max}) before any model writes a line.",
    pillars: [
      {
        title: "Business quality",
        body: "Does it earn well on the capital it employs? ROIC, gross margin and EBIT margin.",
      },
      {
        title: "Financial strength",
        body: "Can it survive a bad year? Net debt/EBITDA, current ratio, debt to equity.",
      },
      {
        title: "Relative valuation",
        body: "Is it cheap against its own history and against its peers? Forward P/E, EV/EBITDA, P/FCF, EV/Sales.",
      },
      {
        title: "Divergence and catalyst",
        body: "Is the price falling while the business improves, and is there a dated event that could close that gap?",
      },
      {
        title: "Alignment of interests",
        body: "Are executives buying with their own money? Is there a verifiable market signal?",
      },
    ],
    footnote:
      "The numbers come from code, not from the model. The model only writes the thesis, citing the computed fields.",
  },
  criteria: {
    title: "trefolio methodology criteria",
    count: "{passed} of {max} met",
    legendPass: "met",
    legendFail: "not met",
    legendNotScored: "not scored",
    unknownNote: "Not enough data",
    notScoredPrefix: "Not scored",
    labels: {
      relativeValuation: {
        name: "Relative valuation",
        hint: "Cheap against its own history and against peers",
      },
      priceFundamentalsDivergence: {
        name: "Price–fundamentals divergence",
        hint: "The price falls while the business improves",
      },
      datedCatalyst: {
        name: "Dated catalyst",
        hint: "An event with a date that could close the gap",
      },
      earningsResilience: {
        name: "Resilience in a downturn",
        hint: "Earnings held up through earlier cycles",
      },
      balanceSheetQuality: {
        name: "Balance sheet quality",
        hint: "Debt, liquidity and cash under control",
      },
      insiderAlignment: {
        name: "Insider alignment",
        hint: "Documented discretionary buying or a founder with real weight",
      },
      competitiveStructure: {
        name: "Competitive structure",
        hint: "A defensible advantage or a niche that is hard to replicate",
      },
      macroContext: {
        name: "Macro context",
        hint: "Sector context — informative",
      },
      marketSignal: {
        name: "Market signal",
        hint: "Verifiable sentiment or superinvestor activity",
      },
    },
  },
  intake: {
    eyebrow: "Screening",
    title: "What are you looking for?",
    agentName: "Intake",
    youLabel: "You",
    briefTitle: "Brief",
    briefEmpty: "Nothing defined yet. Answer or cut the chat short and I will use your preset.",
    briefToggle: "Show brief",
    briefToggleHide: "Hide brief",
    briefEarlyHint: "If you cut it short now, I will fill the gaps with your “My screen” preset.",
    finishEarly: "Finish and search",
    pendingOne: "{n} criterion still open",
    pendingMany: "{n} criteria still open",
    explainToggle: "What do these terms mean?",
    guideTitle: "Metric guide",
    guideBody: "Tap ⓘ on a filter to see what it means and whether higher or lower is usually stricter.",
    guideHigher: "Higher",
    guideLower: "Lower",
    guideEmpty: "As you answer, your filters show up here with a short tip to help you choose.",
    rowHelpAria: "What does {label} mean?",
    doneTitle: "Brief ready",
    doneBody: "I have what I need. Review it and launch the search.",
    earlyFilled:
      "Closed. I filled {n} criteria from your preset ({list}). You can review the brief before launching.",
    earlyNothingMissing: "Closed. You had already defined everything, so nothing was assumed.",
    inputPlaceholder: "Write to the agent…",
    sendLabel: "Send",
    thinking: "Thinking…",
    clarificationTitle: "The agent needs a bit more",
    rejectedTitle: "That brief will not work as-is",
    turnError: "The agent did not respond. Try again in a moment.",
    editRowHint: "Edit {label}",
    editRowPrompt: "I want to change {label}. It is currently “{condition}”. What do you recommend?",
    suggestionsLabel: "Recommended answers",
    readyToLaunch: "Brief looks ready — review below or keep adjusting in the chat.",
    pilotCta: "Watch a sample",
    pilotCtaRunning: "Answering as a sample investor…",
    pilotStop: "Stop",
    pilotIntro:
      "I'll answer as a typical investor so you can see how the brief fills in. When I'm done, review it and press Run the screen.",
    pilotDone:
      "Sample answers are in. Review the brief and press Run the screen when you're ready.",
    pilotStopped: "Stopped the sample. You can keep answering yourself or launch if the brief looks ready.",
    sourceLabels: {
      chat: "you",
      preset: "preset",
      rebalance: "rebalance",
      confirmed: "confirmed",
    },
    presets: {
      marketCap: { label: "Market cap", condition: "300 – 15,000M USD" },
      ndEbitda: { label: "Net debt / EBITDA (LTM)", condition: "< 2.5x" },
      currentRatio: { label: "Current ratio (LTM)", condition: "> 1.5x" },
      roic: { label: "ROIC (LTM)", condition: "> 12%" },
      grossMargin: { label: "Gross margin (FY26 consensus)", condition: "> 30%" },
      ebitMargin: { label: "EBIT margin (LTM)", condition: "> 12%" },
      fwdPe: { label: "Normalised forward P/E (FY26)", condition: "< 15x" },
      tevEbitda: { label: "Forward EV/EBITDA (FY26)", condition: "< 10x" },
      pFcf: { label: "Price / FCF per share (LTM)", condition: "< 15x" },
      tevSales: { label: "EV / Sales (LTM)", condition: "< 8x" },
      debtEquity: { label: "Total debt / equity (LTM)", condition: "< 100%" },
      revenueCagr: { label: "Revenue CAGR FY23→FY26", condition: "> 5%" },
      region: { label: "Region", condition: "US/Canada · Europe · Asia-Pacific" },
    },
    fields: {
      includeSectors: "Sectors included",
      excludeSectors: "Sectors excluded",
      candidateCount: "Number of candidates",
      riskProfile: "Risk profile",
      focusCompany: "Company",
      focusTicker: "Ticker",
      focusExchange: "Exchange",
    },
    analyze: {
      askCompany:
        "Which company should we analyze? Type a ticker (e.g. SAP.DE) or the company name.",
      searchPlaceholder: "Ticker or company name",
      searching: "Searching listings…",
      noResults: "No listings matched. Try another ticker or a fuller company name.",
      pickListing: "I found several listings — pick the right exchange:",
      confirmSelected: "Got it: {name} · {ticker} ({exchange}).",
      confirmSelectedNoExchange: "Got it: {name} · {ticker}.",
      changeCompany: "Change company",
      needCompany: "Choose a company and exchange before running the analysis.",
    },
    /** Short tips for brief rows — what the metric is and how higher/lower reads when choosing. */
    rowHelp: {
      includeSectors: {
        what: "Industries you want in the search. Narrower lists find fewer names but stay closer to a theme.",
      },
      excludeSectors: {
        what: "Industries to skip. Useful when one sector already dominates your portfolio.",
      },
      focusCompany: {
        what: "The company you asked to analyze. Confirmed before research starts.",
      },
      focusTicker: {
        what: "Market symbol for that listing (Yahoo/FMP format).",
      },
      focusExchange: {
        what: "Where the shares trade. Needed when the same name lists on more than one venue.",
      },
      marketCap: {
        what: "Company size on the market (share price × shares). Small/mid caps are less covered by analysts.",
        higher: "Larger firms tend to be more liquid and less volatile, with less room for mispricing.",
        lower: "Smaller firms can move more vs. the business — and swing harder.",
      },
      ndEbitda: {
        what: "Years of operating profit needed to clear net debt. A leverage comfort check.",
        higher: "More leverage — harder to weather a bad year.",
        lower: "Safer balance sheet; below 0 means net cash.",
      },
      currentRatio: {
        what: "Current assets ÷ current liabilities — near-term ability to pay bills.",
        higher: "More short-term liquidity cushion.",
        lower: "Tighter liquidity; under ~1x can signal stress.",
      },
      roic: {
        what: "Return on invested capital: profit per euro employed in the business.",
        higher: "Usually a stronger competitive advantage (stricter quality bar).",
        lower: "Weaker capital efficiency — easier to pass, lower quality bar.",
      },
      grossMargin: {
        what: "Sales minus cost of goods, as a % of sales — pricing power before operating costs.",
        higher: "More room for profit after making/selling the product.",
        lower: "Thinner product economics.",
      },
      ebitMargin: {
        what: "Operating profit as a % of sales — after running the business.",
        higher: "More profitable operations.",
        lower: "Thinner operating profit.",
      },
      fwdPe: {
        what: "Price ÷ next year's expected earnings. How many years of those earnings you pay for.",
        higher: "More expensive (or more growth priced in).",
        lower: "Usually cheaper — unless earnings are collapsing. Stricter screens use a lower ceiling.",
      },
      tevEbitda: {
        what: "Enterprise value ÷ EBITDA — valuation including net debt.",
        higher: "Richer valuation.",
        lower: "Cheaper on an EV basis; stricter screens use a lower ceiling.",
      },
      pFcf: {
        what: "Price ÷ free cash flow per share — what you pay for cash the business actually generates.",
        higher: "More expensive vs. cash generation.",
        lower: "Cheaper vs. free cash flow.",
      },
      tevSales: {
        what: "Enterprise value ÷ sales — useful when earnings are still thin.",
        higher: "Paying more per euro of sales.",
        lower: "Cheaper vs. revenue.",
      },
      debtEquity: {
        what: "Total debt ÷ equity — how much the balance sheet leans on lenders.",
        higher: "More equity leverage risk.",
        lower: "More equity-funded; stricter screens use a lower ceiling.",
      },
      revenueCagr: {
        what: "Average annual sales growth between two fiscal years (compounded).",
        higher: "Faster growth bar — fewer names, more demanding.",
        lower: "Allows slower growers; may include shrinking businesses if too loose.",
      },
      region: {
        what: "Where the company is listed. Affects currency, dividend tax and data coverage.",
      },
      riskProfile: {
        what: "Shapes illustrative position size and concentration caps in the report — research framing, not advice.",
        higher: "Aggressive allows larger illustrative single-name weights.",
        lower: "Conservative keeps single-name weight low.",
      },
    },
    values: {
      none: "—",
      allSectors: "All",
      allButTech: "All except Technology",
      marketCapLarge: "5,000 – 15,000M USD",
      marketCapAny: "No size limit",
      fwdPeStrict: "< 12x",
      roicHigh: "> 15%",
      netCashOnly: "< 0x (net cash)",
      revenueCagrHigh: "> 10%",
      regionEurope: "Europe",
      regionUsEurope: "US/Canada · Europe",
      riskConservative: "Conservative",
      riskBalanced: "Balanced",
      riskAggressive: "Aggressive",
    },
    questions: {
      sectors: {
        askRebalance:
          "I came from the rebalance flow, so I already know the important part: we look in {include} and exclude {exclude}. Keep it that way or adjust it?",
        askRebalanceNoExclude:
          "I came from the rebalance flow, so I already know the important part: we look in {include}. Keep it that way or adjust it?",
        askExplore: "Do you want to restrict by sector or should I look at the whole universe?",
        explain: [
          {
            term: "Sector",
            def: "The company's line of business. Spreading across sectors softens the blow when one of them enters a bad cycle.",
          },
          {
            term: "Underweight",
            def: "A sector where you hold less than you intended. Buying there rebalances without selling what you already own.",
          },
        ],
        options: {
          keep: { label: "Keep it", say: "Keep it that way." },
          dropExclusion: {
            label: "Drop the exclusion",
            say: "Don't exclude anything.",
          },
          wholeUniverse: { label: "Whole universe", say: "Whole universe." },
          avoidTech: { label: "Avoid Technology", say: "Avoid Technology." },
        },
      },
      preset: {
        ask: "Should I apply the recommended core filters (size, P/E, ROIC, leverage, region) or set them one by one?",
        explain: [
          {
            term: "Core filters",
            def: "A short set of the most important screens — market cap, forward P/E, ROIC and net debt / EBITDA — so we still find companies.",
          },
          {
            term: "Filter",
            def: "A condition a company should meet. We prefer names that meet most of them; misses are called out in the report.",
          },
        ],
        options: {
          applyAll: { label: "Apply core filters", say: "Apply the core filters." },
          oneByOne: { label: "Set them myself", say: "I'd rather set the main filters myself." },
        },
      },
      size: {
        ask: "Company size. Recommended: 300–15,000M USD (small/mid cap). Keep it?",
        explain: [
          {
            term: "Market cap",
            def: "Share price × number of shares: what the whole company costs on the market.",
            higher: "Larger firms — more liquidity, usually less mispricing room.",
            lower: "Smaller firms — more room for price to drift, more volatility.",
          },
          {
            term: "Why 300–15,000M USD",
            def: "Small/mid cap range. Fewer analysts follow them, so there is more room for price to drift from the business. The trade-off is volatility and thinner liquidity.",
          },
        ],
        options: {
          keepPreset: { label: "300 – 15,000M USD", say: "Keep 300–15,000M USD." },
          onlyLarge: { label: "Only > 5,000M", say: "Only above 5,000M." },
          noLimit: { label: "No size limit", say: "No size limit." },
        },
      },
      valuation: {
        ask: "Valuation — we keep this simple. Recommended: forward P/E under 15x.",
        explain: [
          {
            term: "Forward P/E",
            def: "Price divided by next year's expected earnings per share. 15x means paying 15 years of those earnings.",
            higher: "More expensive (or more growth already priced in).",
            lower: "Usually cheaper — unless earnings are collapsing. A lower ceiling is a stricter screen.",
          },
        ],
        options: {
          keepAll: { label: "P/E < 15x", say: "Keep forward P/E under 15x." },
          stricter: { label: "Stricter: P/E < 12x", say: "Bring the P/E down to 12x." },
          onlyTwo: { label: "No P/E filter", say: "Skip the P/E filter." },
        },
      },
      quality: {
        ask: "Quality — keep it to ROIC and leverage. Recommended: ROIC > 12% and net debt / EBITDA < 2.5x.",
        explain: [
          {
            term: "ROIC",
            def: "Return on invested capital: how much the company earns per euro employed in the business. Sustained above 12% usually points to a real competitive advantage.",
            higher: "Stricter quality bar — fewer names, stronger businesses.",
            lower: "Easier to pass — includes weaker capital returns.",
          },
          {
            term: "Net debt / EBITDA",
            def: "How many years of operating profit it would take to clear net debt. Below 2.5x is a common comfort band.",
            higher: "More leverage — riskier in a downturn.",
            lower: "Safer balance sheet; below 0 means net cash. A lower ceiling is stricter.",
          },
        ],
        options: {
          keepAll: { label: "ROIC + leverage", say: "Keep ROIC and leverage filters." },
          netCash: { label: "Prefer net cash", say: "Prefer net cash (ND/EBITDA < 0)." },
          highRoic: { label: "Higher ROIC > 15%", say: "Raise ROIC to 15%." },
        },
      },
      growth: {
        ask: "Growth. Preset: revenue CAGR FY23→FY26 above 5%.",
        explain: [
          {
            term: "Revenue CAGR",
            def: "Compound annual growth rate: the average pace at which sales grow between two years, already smoothed.",
            higher: "Faster growth required — fewer candidates.",
            lower: "Allows slower growers; too low may let shrinking businesses through.",
          },
        ],
        options: {
          keepPreset: { label: "> 5% (preset)", say: "CAGR above 5% is fine." },
          higher: { label: "> 10%", say: "I want above 10%." },
        },
      },
      region: {
        ask: "Region. Preset: US/Canada, Europe and Asia-Pacific. Note that data coverage outside the US can be partial.",
        explain: [
          {
            term: "Region",
            def: "Where the company is listed. It affects currency, dividend taxation and market hours.",
          },
          {
            term: "Data coverage",
            def: "Outside the US, fundamentals arrive later or incomplete. When that happens the report says so on the card, with the cut-off date.",
          },
        ],
        options: {
          allThree: { label: "All three regions", say: "All three regions." },
          europe: { label: "Europe only", say: "Europe only." },
          usEurope: { label: "US + Europe", say: "US and Europe." },
        },
      },
      count: {
        ask: "How many candidates do you want in the report?",
        explain: [
          {
            term: "Number of candidates",
            def: "Unused — the report always targets up to five companies.",
          },
        ],
        options: {
          five: { label: "5 candidates", say: "Five." },
          three: { label: "3 candidates", say: "Three is enough." },
        },
      },
      riskProfile: {
        ask: "Last thing: which risk profile should guide sizing and concentration checks?",
        explain: [
          {
            term: "Risk profile",
            def: "Shapes illustrative allocation bands and concentration caps. This is research framing, not advice.",
            higher: "Aggressive allows larger illustrative single-name sizes.",
            lower: "Conservative keeps single-name weight low.",
          },
        ],
        options: {
          conservative: { label: "Conservative", say: "Conservative." },
          balanced: { label: "Balanced", say: "Balanced." },
          aggressive: { label: "Aggressive", say: "Aggressive." },
        },
      },
    },
  },
  brief: {
    eyebrow: "Confirmation",
    title: "Brief ready to run",
    filtersTitle: "Screen filters",
    colFilter: "Filter",
    colCondition: "Condition",
    colSource: "Source",
    costTitle: "Cost and expectations",
    costBody:
      "Estimated run time is several minutes: Hard Data ranks ~20 equities, research agents investigate each one, then the Compiler picks the best 5 and verification checks the claims.",
    costBodyAnalyze:
      "Estimated run time is a few minutes: we research this one listing (business, news, technicals), then write a single-company report and verify the claims.",
    runCta: "Run the screen",
    runCtaAnalyze: "Run the analysis",
    editCta: "Adjust in the chat",
    empty: "The brief is empty. Go back to the chat to define your criteria.",
  },
  progress: {
    eyebrow: "Screening",
    title: "Working on your screen",
    body: "Each agent appears as it starts. You can leave and come back — nothing is lost.",
    readyTitle: "Your report is ready",
    readyBody: "All agents finished. Open the report when you want to review the candidates.",
    seeReportCta: "See report",
    loadingReport: "Loading report…",
    backToAgents: "Back to agents",
    statusPending: "pending",
    statusRunning: "running",
    statusDone: "done",
    statusFailed: "failed",
    statusSkipped: "coming soon",
    statusRunningLine: "In progress…",
    statusDoneLine: "Done",
    failed: "The run failed. Nothing was charged.",
    failedBanner:
      "A step failed — see the agent marked ✕ below. Nothing was charged.",
    failedStepDetail: "Error: {message}",
    irSubtext: "{done}/{total} tickers",
    irInvestigating: "Investigating names that match your brief…",
    qaVerifyingRound: "Checking claims and citations…",
    lastUpdateJustNow: "Last update just now",
    lastUpdateSeconds: "Last update {n}s ago",
    lastUpdateMinutes: "Last update {n} min ago",
    stallStale:
      "No updates for a bit — the pipeline may still be working on a long research step.",
    stallStuck:
      "This run looks stuck (no progress for several minutes). You can try to resume it.",
    resumeCta: "Resume run",
    resumeWorking: "Resuming…",
    resumeFailed: "Could not resume the run. Try again in a moment.",
    pollTimeout:
      "We stopped auto-refreshing after a long wait. Resume the run or reload this page to check again.",
    activity: {
      intake: "Brief confirmed and handed to the research pipeline.",
      hard_data:
        "Pulling the equity universe and ranking names against your brief.",
      ir_business:
        "Reading filings and business context — one company at a time.",
      web_sentiment:
        "Gathering dated news and sentiment signals for each name.",
      technicals: "Checking price levels, trend and distance to highs/lows.",
      portfolio_context: "Comparing candidates to your current holdings and cash.",
      risk: "Scoring suitability and concentration for your risk profile.",
      compiler: "Choosing the best fits and writing the shortlist thesis.",
      shortlist_research: "Deep-diving the shortlist with company research.",
      qa: "Verifying numbers, citations and cross-agent consistency.",
    },
    steps: {
      intake: "Intake",
      hard_data: "Hard data",
      ir_business: "Business research",
      web_sentiment: "Web & sentiment",
      technicals: "Technicals",
      portfolio_context: "Portfolio fit",
      risk: "Risk",
      compiler: "Selecting top candidates",
      shortlist_research: "Shortlist research",
      qa: "Verification",
    },
  },
  report: {
    eyebrow: "Research report · automated",
    title: "Candidates for your portfolio",
    metaLine: "Job {jobId} · {date}",
    methodologyTitle: "Methodology",
    summaryTitle: "Executive summary",
    priorityTitle: "Priority order",
    comparisonTitle: "Comparison table",
    cardsTitle: "Detailed cards",
    colTicker: "Ticker",
    colCompany: "Company",
    colValuation: "Valuation",
    colGrowth: "Growth",
    colScore: "Score",
    colVerdict: "Verdict",
    businessTitle: "What it does",
    employees: "{n} employees",
    listedSince: "listed since {year}",
    linkWebsite: "Official site",
    linkIr: "Investor relations",
    linkTrefolio: "trefolio page",
    catalyst: "Catalyst",
    thesisTitle: "Thesis",
    unmetBriefTitle: "Brief expectations not met",
    unmetBriefHint: "This name met {met} of {total} evaluable filters — missing:",
    risksTitle: "Risks",
    sourcesToggle: "Sources ({n})",
    metaPrice: "Price",
    metaTarget: "Target",
    metaFwdPe: "Fwd P/E",
    metaPe: "P/E",
    metaEvEbitda: "EV/EBITDA",
    metaNdEbitda: "ND/EBITDA",
    metaDividend: "Dividend",
    metaNetCash: "Net cash",
    metaMoat: "MOAT",
    technicalsTitle: "Technicals",
    metaFromHigh: "From 52w high",
    metaFromLow: "From 52w low",
    metaTrend: "Trend",
    metaTrendAboveMa200: "Above 200d MA",
    metaTrendBelowMa200: "Below 200d MA",
    metaSupport: "Support",
    metaResistance: "Resistance",
    metaReturn3m: "Return 3m",
    metaReturn1y: "Return 1y",
    metaVolatility: "Volatility (ann.)",
    yes: "Yes",
    no: "No",
    verdicts: {
      fuerte: "Strong candidate",
      watch: "Watch",
      pass: "Pass",
      fail: "Fail",
    },
    partialNotice: "Partial report — these agents have not run yet: {agents}.",
    externalLinksNote:
      "Company and regulator links open outside trefolio. We do not control or endorse their content.",
    loadError: "The report could not be loaded.",
    verifiedEmptyError:
      "Verification could not confirm enough claims for any candidate. Try again or request a refund from Profile.",
    emptyCandidates:
      "No candidates matched this brief. Broaden sectors, market-cap, or valuation filters and try again.",
    sentimentTitle: "Sentiment",
    fitRiskTitle: "Fit & risk",
    positionNew: "New position",
    positionTopUp: "Top-up existing",
    suitabilityFit: "Fit",
    suitabilityStretch: "Stretch",
    suitabilityPoor: "Poor fit",
    illustrativeWeight: "Illustrative weight {pct}%",
    illustrativeAllocation: "Illustrative allocation €{min}–€{max}",
    insiderBuying: "Insiders: buying bias",
    insiderSelling: "Insiders: selling bias",
    insiderMixed: "Insiders: mixed",
    insiderNone: "Insiders: no clear bias",
    unlockReportChip: "Unlock report",
    lockedCandidate: "Candidate {n}",
    lockedCell: "••••",
    verificationVerified: "Verified · no issues flagged",
    verificationFlagged:
      "{count} claim(s) flagged for review — see per-candidate notes below.",
    verificationDegraded:
      "Verified with caveats · some claims could not be confirmed. Review flagged notes on each card.",
    verificationExpand: "Show flagged claims",
    verificationCollapse: "Hide flagged claims",
    verificationTitle: "Verification",
    verificationRoundLabel: "Round {n}",
    verificationIssueTypes: {
      quant_mismatch: "Quantitative mismatch",
      unconfirmed_source: "Unconfirmed source",
      cross_agent_inconsistency: "Cross-agent inconsistency",
      rule_violation: "Rule violation",
      other: "Other",
    },
    verificationRuleLabels: {
      R1: "R1 — Insider classification",
      R2: "R2 — Sentiment noise",
      R3: "R3 — Insider directional context",
      R4: "R4 — P/E history",
      R5: "R5 — Cross-source conflict",
      R6: "R6 — Guidance freshness",
      R7: "R7 — Price-drop causality",
      R8: "R8 — M&A vs organic growth",
      R9: "R9 — Peer filtering",
      R10: "R10 — Analyst coverage",
    },
    candidateVerifiedBadge: "Verified",
    candidateFlaggedBadge: "Claims flagged",
  },
};

export type ScreeningCopy = typeof en;

const es: ScreeningCopy = {
  common: {
    disclaimerShort: "Investigación automatizada, no asesoramiento financiero.",
    aiLabel: "Generado con IA — puede contener errores",
    back: "Volver",
    backHome: "Volver al inicio",
  },
  homeBeta: {
    badge: "Beta",
    title: "Cribado de inversión",
    body: "Convierte tu mezcla por sectores en una lista corta investigada — hasta 3 cribados por semana en beta.",
    cta: "Probar cribado",
  },
  quota: {
    remaining: "Te quedan {remaining} de {limit} cribados esta semana",
    exhausted:
      "Has usado tus 3 cribados de esta semana. Vuelve a intentarlo cuando se reinicie el límite semanal.",
  },
  entry: {
    eyebrow: "Tu cartera hoy",
    titleOverexposed: "Estás sobreexpuesto a {sector}",
    titleBalanced: "Tu cartera está equilibrada",
    bodyOverexposed:
      "{sector} pesa {pct} de tu cartera. Por encima del {threshold}, un solo sector manda en tu resultado más que tus decisiones.",
    bodyBalanced:
      "Ningún sector supera el {threshold}. La concentración está bajo control: buen momento para explorar candidatos nuevos, no para rebalancear.",
    bodyEmpty:
      "Todavía no hemos podido leer los pesos por sector de esta cartera. Puedes lanzar un cribado con tus propios criterios.",
    breakdownTitle: "Distribución por sector",
    badgeOverexposed: "Sobreexpuesto",
    badgeUnderweight: "Casi sin exposición",
    unclassified: "Sin clasificar",
    optionsTitle: "¿Qué quieres hacer?",
    optionsTitleBalanced: "¿Listo para explorar?",
    rebalanceEyebrowPrimary: "Opción A · rebalanceo",
    rebalanceEyebrowSecondary: "Opción B · rebalanceo",
    rebalanceTitle: "Buscar candidatos que compensen la cartera",
    rebalanceBody:
      "El agente arranca sabiendo qué sectores te faltan y cuál evitar. Buscará en {include} y excluirá {exclude}.",
    rebalanceBodyNoTarget:
      "El agente arranca sabiendo qué sectores te faltan. Buscará en {include}.",
    rebalanceBodyBalanced:
      "Nada está sobreexpuesto. Si aún quieres sesgar la mezcla, el agente puede buscar en {include} sin excluir ningún sector.",
    rebalanceBodyBalancedNone:
      "Nada está sobreexpuesto. Aun así puedes pedirle al agente candidatos que inclinen un poco la mezcla, sin exclusión forzada.",
    rebalanceCta: "Compensar cartera",
    chipInclude: "Incluir {sector}",
    chipExclude: "Excluir {sector}",
    exploreEyebrowPrimary: "Opción A · exploración",
    exploreEyebrowSecondary: "Opción B · exploración",
    exploreTitle: "Screener de nuevas oportunidades",
    exploreBody:
      "Sin restricción sectorial. El agente pregunta todo desde cero: tamaño, valoración, calidad de balance, crecimiento y región.",
    exploreCta: "Buscar oportunidades",
    exploreChipNeutral: "Sin sesgo de sector",
    exploreChipPreset: "Preset «Mi cribado» disponible",
    analyzeEyebrow: "Opción C · analizar",
    analyzeTitle: "Profundizar en una empresa",
    analyzeBody:
      "Escribe un ticker o el nombre. Primero resolvemos la cotización (y el exchange) y luego los agentes investigan solo ese nombre.",
    analyzeCta: "Analizar una empresa",
    analyzeChipSearch: "Ticker o nombre",
    analyzeChipExchange: "Exchange confirmado",
    discoveryEyebrow: "Cribado de inversión",
    discoveryTitle: "Criba candidatos para tu cartera",
    discoveryBody:
      "Parte de tu mezcla por sectores: rebalancea si algo pesa de más, explora libremente, o profundiza en una sola empresa.",
    discoveryCta: "Abrir cribado",
    recentScreens: {
      title: "Tus cribados recientes",
      empty: "Aún no hay cribados. Empieza uno arriba — aparecerá aquí.",
      statusQueued: "En cola",
      statusRunning: "En curso",
      statusCompleted: "Completado",
      statusFailed: "Falló",
      viewReport: "Ver informe",
      viewProgress: "Ver progreso",
      intentRebalance: "Rebalanceo",
      intentExplore: "Exploración",
      intentAnalyze: "Analizar",
    },
  },
  methodology: {
    title: "Metodología trefolio",
    intro:
      "Toda búsqueda usa el mismo marco: cinco pilares que se puntúan de forma determinística (0–{max}) antes de que ningún modelo escriba una línea.",
    pillars: [
      {
        title: "Calidad del negocio",
        body: "¿Gana bien con el capital que emplea? ROIC, margen bruto y margen EBIT.",
      },
      {
        title: "Solidez financiera",
        body: "¿Aguanta un año malo? Deuda neta/EBITDA, ratio corriente, deuda sobre fondos propios.",
      },
      {
        title: "Valoración relativa",
        body: "¿Está barata contra su propia historia y contra sus comparables? PER forward, TEV/EBITDA, P/FCF, TEV/Ventas.",
      },
      {
        title: "Divergencia y catalizador",
        body: "¿El precio cae mientras el negocio mejora, y hay un evento con fecha que pueda cerrar esa brecha?",
      },
      {
        title: "Alineación de intereses",
        body: "¿Compran los directivos con su dinero? ¿Hay señal de mercado verificable?",
      },
    ],
    footnote:
      "Los números salen de código, no del modelo. El modelo solo redacta la tesis citando los campos calculados.",
  },
  criteria: {
    title: "Criterios de la metodología trefolio",
    count: "{passed} de {max} cumplidos",
    legendPass: "cumple",
    legendFail: "no cumple",
    legendNotScored: "no puntúa",
    unknownNote: "Sin datos suficientes",
    notScoredPrefix: "No puntúa",
    labels: {
      relativeValuation: {
        name: "Valoración relativa",
        hint: "Barata frente a su propia historia y a comparables",
      },
      priceFundamentalsDivergence: {
        name: "Divergencia precio–fundamentales",
        hint: "El precio cae mientras el negocio mejora",
      },
      datedCatalyst: {
        name: "Catalizador fechado",
        hint: "Evento con fecha que puede cerrar la brecha",
      },
      earningsResilience: {
        name: "Resiliencia en crisis",
        hint: "El beneficio aguantó ciclos anteriores",
      },
      balanceSheetQuality: {
        name: "Calidad de balance",
        hint: "Deuda, liquidez y caja bajo control",
      },
      insiderAlignment: {
        name: "Alineación de insiders",
        hint: "Compra discrecional documentada o fundador con peso",
      },
      competitiveStructure: {
        name: "Estructura competitiva",
        hint: "Ventaja defendible o nicho difícil de replicar",
      },
      macroContext: {
        name: "Contexto macro",
        hint: "Contexto del sector — informativo",
      },
      marketSignal: {
        name: "Señal de mercado",
        hint: "Sentimiento o superinversores verificables",
      },
    },
  },
  intake: {
    eyebrow: "Cribado",
    title: "¿Qué estás buscando?",
    agentName: "Intake",
    youLabel: "Tú",
    briefTitle: "Brief",
    briefEmpty: "Todavía sin definir. Responde o corta el chat y uso tu preset.",
    briefToggle: "Ver brief",
    briefToggleHide: "Ocultar brief",
    briefEarlyHint: "Si cortas ahora, completo lo que falte con tu preset “Mi cribado”.",
    finishEarly: "Terminar y buscar",
    pendingOne: "{n} criterio por definir",
    pendingMany: "{n} criterios por definir",
    explainToggle: "¿Qué significan estos términos?",
    guideTitle: "Guía de métricas",
    guideBody: "Pulsa ⓘ en un filtro para ver qué significa y si más alto o más bajo suele ser más estricto.",
    guideHigher: "Más alto",
    guideLower: "Más bajo",
    guideEmpty: "Conforme respondes, tus filtros aparecen aquí con una pista corta para ayudarte a elegir.",
    rowHelpAria: "¿Qué significa {label}?",
    doneTitle: "Brief listo",
    doneBody: "Tengo lo que necesito. Revísalo y lanza la búsqueda.",
    earlyFilled:
      "Cerrado. Completé {n} criterios con tu preset ({list}). Puedes revisar el brief antes de lanzar.",
    earlyNothingMissing: "Cerrado. Ya tenías todo definido, así que no he supuesto nada.",
    inputPlaceholder: "Escríbele al agente…",
    sendLabel: "Enviar",
    thinking: "Pensando…",
    clarificationTitle: "El agente necesita un poco más",
    rejectedTitle: "Ese brief no funcionará tal cual",
    turnError: "El agente no respondió. Vuelve a intentarlo en un momento.",
    editRowHint: "Editar {label}",
    editRowPrompt: "Quiero cambiar {label}. Ahora mismo es “{condition}”. ¿Qué me recomiendas?",
    suggestionsLabel: "Respuestas recomendadas",
    readyToLaunch: "El brief parece listo — revísalo abajo o sigue ajustando en el chat.",
    pilotCta: "Ver un ejemplo",
    pilotCtaRunning: "Respondiendo como inversor de ejemplo…",
    pilotStop: "Parar",
    pilotIntro:
      "Voy a responder como un inversor típico para que veas cómo se arma el brief. Cuando termine, revísalo y pulsa Ejecutar el cribado.",
    pilotDone:
      "Ya están las respuestas de ejemplo. Revisa el brief y pulsa Ejecutar el cribado cuando quieras.",
    pilotStopped:
      "Paré el ejemplo. Puedes seguir respondiendo tú o lanzar si el brief ya está listo.",
    sourceLabels: {
      chat: "tú",
      preset: "preset",
      rebalance: "rebalanceo",
      confirmed: "confirmado",
    },
    presets: {
      marketCap: { label: "Capitalización", condition: "300 – 15.000 M USD" },
      ndEbitda: { label: "Deuda neta / EBITDA (LTM)", condition: "< 2,5x" },
      currentRatio: { label: "Ratio corriente (LTM)", condition: "> 1,5x" },
      roic: { label: "ROIC (LTM)", condition: "> 12%" },
      grossMargin: { label: "Margen bruto (FY26 consenso)", condition: "> 30%" },
      ebitMargin: { label: "Margen EBIT (LTM)", condition: "> 12%" },
      fwdPe: { label: "PER fwd normalizado (FY26)", condition: "< 15x" },
      tevEbitda: { label: "TEV/EBITDA fwd (FY26)", condition: "< 10x" },
      pFcf: { label: "Precio / FCF por acción (LTM)", condition: "< 15x" },
      tevSales: { label: "TEV / Ventas (LTM)", condition: "< 8x" },
      debtEquity: { label: "Deuda total / fondos propios (LTM)", condition: "< 100%" },
      revenueCagr: { label: "CAGR ingresos FY23→FY26", condition: "> 5%" },
      region: { label: "Región", condition: "EE.UU./Canadá · Europa · Asia-Pacífico" },
    },
    fields: {
      includeSectors: "Sectores incluidos",
      excludeSectors: "Sectores excluidos",
      candidateCount: "Nº de candidatos",
      riskProfile: "Perfil de riesgo",
      focusCompany: "Empresa",
      focusTicker: "Ticker",
      focusExchange: "Exchange",
    },
    analyze: {
      askCompany:
        "¿Qué empresa quieres analizar? Escribe un ticker (p. ej. SAP.DE) o el nombre de la compañía.",
      searchPlaceholder: "Ticker o nombre de empresa",
      searching: "Buscando cotizaciones…",
      noResults: "No hay coincidencias. Prueba otro ticker o el nombre completo.",
      pickListing: "Hay varias cotizaciones — elige el exchange correcto:",
      confirmSelected: "Perfecto: {name} · {ticker} ({exchange}).",
      confirmSelectedNoExchange: "Perfecto: {name} · {ticker}.",
      changeCompany: "Cambiar empresa",
      needCompany: "Elige empresa y exchange antes de lanzar el análisis.",
    },
    rowHelp: {
      includeSectors: {
        what: "Industrias que quieres en la búsqueda. Listas más estrechas encuentran menos nombres pero se acercan más a un tema.",
      },
      excludeSectors: {
        what: "Industrias a omitir. Útil cuando un sector ya domina tu cartera.",
      },
      focusCompany: {
        what: "La empresa que pediste analizar. Se confirma antes de investigar.",
      },
      focusTicker: {
        what: "Símbolo de mercado de esa cotización (formato Yahoo/FMP).",
      },
      focusExchange: {
        what: "Dónde cotiza. Necesario cuando el mismo nombre aparece en más de un mercado.",
      },
      marketCap: {
        what: "Tamaño de la empresa en bolsa (precio × acciones). Las small/mid cap tienen menos cobertura de analistas.",
        higher: "Empresas más grandes: más liquidez y menos volatilidad, con menos margen de desajuste de precio.",
        lower: "Empresas más pequeñas: el precio puede desviarse más del negocio — y oscilar más.",
      },
      ndEbitda: {
        what: "Años de beneficio operativo para devolver la deuda neta. Comprueba el apalancamiento.",
        higher: "Más apalancamiento — más difícil aguantar un mal año.",
        lower: "Balance más sano; por debajo de 0 es caja neta.",
      },
      currentRatio: {
        what: "Activo corriente ÷ pasivo corriente — capacidad de pagar facturas a corto plazo.",
        higher: "Más colchón de liquidez a corto plazo.",
        lower: "Liquidez más justa; por debajo de ~1x puede indicar tensión.",
      },
      roic: {
        what: "Retorno sobre el capital invertido: beneficio por euro empleado en el negocio.",
        higher: "Suele indicar ventaja competitiva más fuerte (filtro de calidad más estricto).",
        lower: "Menor eficiencia de capital — más fácil de pasar, listón de calidad más bajo.",
      },
      grossMargin: {
        what: "Ventas menos coste de producto, en % de ventas — poder de precio antes de costes operativos.",
        higher: "Más margen para beneficio tras fabricar/vender.",
        lower: "Economía de producto más fina.",
      },
      ebitMargin: {
        what: "Beneficio operativo en % de ventas — después de gestionar el negocio.",
        higher: "Operaciones más rentables.",
        lower: "Beneficio operativo más fino.",
      },
      fwdPe: {
        what: "Precio ÷ beneficio esperado del próximo ejercicio. Cuántos años de ese beneficio pagas.",
        higher: "Más cara (o más crecimiento ya descontado).",
        lower: "Suele ser más barata — salvo que el beneficio se hunda. Un techo más bajo es un cribado más estricto.",
      },
      tevEbitda: {
        what: "Valor de empresa ÷ EBITDA — valoración incluyendo deuda neta.",
        higher: "Valoración más rica.",
        lower: "Más barata en base EV; un techo más bajo es más estricto.",
      },
      pFcf: {
        what: "Precio ÷ flujo de caja libre por acción — lo que pagas por la caja que genera el negocio.",
        higher: "Más cara frente a la generación de caja.",
        lower: "Más barata frente al flujo de caja libre.",
      },
      tevSales: {
        what: "Valor de empresa ÷ ventas — útil cuando el beneficio aún es fino.",
        higher: "Pagas más por cada euro de ventas.",
        lower: "Más barata frente a ingresos.",
      },
      debtEquity: {
        what: "Deuda total ÷ fondos propios — cuánto se apoya el balance en prestamistas.",
        higher: "Más riesgo de apalancamiento sobre el equity.",
        lower: "Más financiada con equity; un techo más bajo es más estricto.",
      },
      revenueCagr: {
        what: "Crecimiento medio anual de ventas entre dos ejercicios (compuesto).",
        higher: "Listón de crecimiento más alto — menos nombres, más exigente.",
        lower: "Permite crecimientos más lentos; si es demasiado laxo puede colar negocios que se encogen.",
      },
      region: {
        what: "Dónde cotiza la empresa. Afecta a divisa, fiscalidad de dividendos y cobertura de datos.",
      },
      riskProfile: {
        what: "Define bandas ilustrativas de tamaño y topes de concentración en el informe — marco de investigación, no consejo.",
        higher: "Agresivo permite pesos ilustrativos mayores por nombre.",
        lower: "Conservador mantiene poco peso por nombre.",
      },
    },
    values: {
      none: "—",
      allSectors: "Todos",
      allButTech: "Todos menos Technology",
      marketCapLarge: "5.000 – 15.000 M USD",
      marketCapAny: "Sin límite de tamaño",
      fwdPeStrict: "< 12x",
      roicHigh: "> 15%",
      netCashOnly: "< 0x (caja neta)",
      revenueCagrHigh: "> 10%",
      regionEurope: "Europa",
      regionUsEurope: "EE.UU./Canadá · Europa",
      riskConservative: "Conservador",
      riskBalanced: "Equilibrado",
      riskAggressive: "Agresivo",
    },
    questions: {
      sectors: {
        askRebalance:
          "Vengo del rebalanceo, así que ya sé lo importante: buscamos en {include} y excluimos {exclude}. ¿Lo dejamos así o lo ajustamos?",
        askRebalanceNoExclude:
          "Vengo del rebalanceo, así que ya sé lo importante: buscamos en {include}. ¿Lo dejamos así o lo ajustamos?",
        askExplore: "¿Quieres restringir por sector o miro todo el universo?",
        explain: [
          {
            term: "Sector",
            def: "Actividad económica de la empresa. Repartir entre sectores reduce el golpe cuando uno entra en un ciclo malo.",
          },
          {
            term: "Infraponderado",
            def: "Sector donde pesas menos de lo que te habías marcado. Comprar ahí equilibra sin vender lo que ya tienes.",
          },
        ],
        options: {
          keep: { label: "Déjalo así", say: "Déjalo así." },
          dropExclusion: { label: "Quita la exclusión", say: "No excluyas nada." },
          wholeUniverse: { label: "Todo el universo", say: "Todo el universo." },
          avoidTech: { label: "Evita Technology", say: "Evita Technology." },
        },
      },
      preset: {
        ask: "¿Aplico los filtros clave recomendados (tamaño, PER, ROIC, apalancamiento, región) o los fijamos uno a uno?",
        explain: [
          {
            term: "Filtros clave",
            def: "Un set corto de lo más importante — capitalización, PER forward, ROIC y deuda neta / EBITDA — para seguir encontrando empresas.",
          },
          {
            term: "Filtro",
            def: "Una condición que la empresa debería cumplir. Preferimos las que cumplen la mayoría; los fallos se indican en el informe.",
          },
        ],
        options: {
          applyAll: { label: "Aplicar filtros clave", say: "Aplica los filtros clave." },
          oneByOne: { label: "Los elijo yo", say: "Prefiero fijar los filtros principales yo." },
        },
      },
      size: {
        ask: "Tamaño de empresa. Recomendado: 300–15.000 M USD (small/mid cap). ¿Lo mantengo?",
        explain: [
          {
            term: "Capitalización de mercado",
            def: "Precio de la acción × número de acciones: lo que cuesta la empresa entera en bolsa.",
            higher: "Empresas más grandes — más liquidez, suele haber menos margen de desajuste.",
            lower: "Empresas más pequeñas — más margen para que el precio se despegue, más volatilidad.",
          },
          {
            term: "Por qué 300–15.000 M USD",
            def: "Rango small/mid cap. Menos analistas la siguen, así que hay más margen para que el precio se despegue del negocio. A cambio: más volatilidad y menos liquidez.",
          },
        ],
        options: {
          keepPreset: { label: "300 – 15.000 M USD", say: "Mantén 300–15.000 M USD." },
          onlyLarge: { label: "Solo > 5.000 M", say: "Solo por encima de 5.000 M." },
          noLimit: { label: "Sin límite de tamaño", say: "Sin límite de tamaño." },
        },
      },
      valuation: {
        ask: "Valoración — lo dejamos simple. Recomendado: PER forward por debajo de 15x.",
        explain: [
          {
            term: "PER forward",
            def: "Precio dividido entre el beneficio por acción esperado del próximo ejercicio. 15x significa pagar 15 años de ese beneficio.",
            higher: "Más cara (o más crecimiento ya descontado).",
            lower: "Suele ser más barata — salvo que el beneficio se hunda. Un techo más bajo es un cribado más estricto.",
          },
        ],
        options: {
          keepAll: { label: "PER < 15x", say: "Mantén PER forward bajo 15x." },
          stricter: { label: "Más estricto: PER < 12x", say: "Bájame el PER a 12x." },
          onlyTwo: { label: "Sin filtro de PER", say: "Sin filtro de PER." },
        },
      },
      quality: {
        ask: "Calidad — nos quedamos con ROIC y apalancamiento. Recomendado: ROIC > 12% y deuda neta / EBITDA < 2,5x.",
        explain: [
          {
            term: "ROIC",
            def: "Retorno sobre el capital invertido: cuánto gana la empresa por cada euro que emplea en el negocio. Por encima del 12% sostenido suele indicar una ventaja competitiva real.",
            higher: "Listón de calidad más estricto — menos nombres, negocios más fuertes.",
            lower: "Más fácil de pasar — incluye retornos de capital más débiles.",
          },
          {
            term: "Deuda neta / EBITDA",
            def: "Años de beneficio operativo para devolver la deuda menos la caja. Por debajo de 2,5x es una banda habitual de confort.",
            higher: "Más apalancamiento — más riesgo en una caída.",
            lower: "Balance más sano; por debajo de 0 es caja neta. Un techo más bajo es más estricto.",
          },
        ],
        options: {
          keepAll: { label: "ROIC + apalancamiento", say: "Mantén ROIC y apalancamiento." },
          netCash: { label: "Preferir caja neta", say: "Preferir caja neta (ND/EBITDA < 0)." },
          highRoic: { label: "ROIC más alto > 15%", say: "Sube el ROIC a 15%." },
        },
      },
      growth: {
        ask: "Crecimiento. Preset: CAGR de ingresos FY23→FY26 por encima del 5%.",
        explain: [
          {
            term: "CAGR de ingresos",
            def: "Tasa de crecimiento anual compuesta: el ritmo medio al que crecen las ventas entre dos ejercicios, ya suavizado.",
            higher: "Exige más crecimiento — menos candidatos.",
            lower: "Permite crecimientos más lentos; demasiado bajo puede colar negocios que se encogen.",
          },
        ],
        options: {
          keepPreset: { label: "> 5% (preset)", say: "CAGR > 5% está bien." },
          higher: { label: "> 10%", say: "Quiero > 10%." },
        },
      },
      region: {
        ask: "Región. Preset: EE.UU./Canadá, Europa y Asia-Pacífico. Ten en cuenta que la cobertura de datos fuera de EE.UU. puede ser parcial.",
        explain: [
          {
            term: "Región",
            def: "Dónde cotiza la empresa. Afecta a divisa, fiscalidad de dividendos y horario de mercado.",
          },
          {
            term: "Cobertura de datos",
            def: "Fuera de EE.UU. los fundamentales llegan con más retraso o incompletos. Cuando pasa, el informe lo dice en la ficha con la fecha de corte.",
          },
        ],
        options: {
          allThree: { label: "Las tres regiones", say: "Las tres regiones." },
          europe: { label: "Solo Europa", say: "Solo Europa." },
          usEurope: { label: "EE.UU. + Europa", say: "EE.UU. y Europa." },
        },
      },
      count: {
        ask: "¿Cuántos candidatos quieres en el informe?",
        explain: [
          {
            term: "Nº de candidatos",
            def: "Cuántas empresas llegan a ficha completa. Cada una consume investigación real, así que más candidatos alarga la ejecución.",
          },
        ],
        options: {
          five: { label: "5 candidatos", say: "Cinco." },
          three: { label: "3 candidatos", say: "Tres me vale." },
        },
      },
      riskProfile: {
        ask: "Último punto: ¿qué perfil de riesgo debe guiar el sizing y la concentración?",
        explain: [
          {
            term: "Perfil de riesgo",
            def: "Define bandas ilustrativas de asignación y topes de concentración. Es marco de investigación, no consejo.",
            higher: "Agresivo permite tamaños ilustrativos mayores por nombre.",
            lower: "Conservador mantiene poco peso por nombre.",
          },
        ],
        options: {
          conservative: { label: "Conservador", say: "Conservador." },
          balanced: { label: "Equilibrado", say: "Equilibrado." },
          aggressive: { label: "Agresivo", say: "Agresivo." },
        },
      },
    },
  },
  brief: {
    eyebrow: "Confirmación",
    title: "Brief listo para ejecutar",
    filtersTitle: "Filtros del cribado",
    colFilter: "Filtro",
    colCondition: "Condición",
    colSource: "Origen",
    costTitle: "Coste y expectativa",
    costBody:
      "La ejecución estimada son varios minutos: Hard Data rankea ~20 acciones, los agentes investigan cada una, el Compiler elige las 5 mejores y la verificación revisa las afirmaciones.",
    costBodyAnalyze:
      "La ejecución estimada son unos minutos: investigamos esta cotización (negocio, noticias, técnico), redactamos un informe de una empresa y verificamos las afirmaciones.",
    runCta: "Ejecutar el cribado",
    runCtaAnalyze: "Ejecutar el análisis",
    editCta: "Ajustar en el chat",
    empty: "El brief está vacío. Vuelve al chat para definir tus criterios.",
  },
  progress: {
    eyebrow: "Cribado",
    title: "Trabajando en tu cribado",
    body: "Cada agente aparece cuando arranca. Puedes salir y volver — no se pierde nada.",
    readyTitle: "Tu informe está listo",
    readyBody: "Todos los agentes han terminado. Abre el informe cuando quieras revisar los candidatos.",
    seeReportCta: "Ver informe",
    loadingReport: "Cargando informe…",
    backToAgents: "Volver a agentes",
    statusPending: "pendiente",
    statusRunning: "en curso",
    statusDone: "hecho",
    statusFailed: "falló",
    statusSkipped: "próximamente",
    statusRunningLine: "En curso…",
    statusDoneLine: "Hecho",
    failed: "La ejecución falló. No se ha cobrado nada.",
    failedBanner:
      "Un paso falló — mira el agente marcado con ✕ abajo. No se ha cobrado nada.",
    failedStepDetail: "Error: {message}",
    irSubtext: "{done}/{total} tickers",
    irInvestigating: "Investigando nombres que encajan con tu brief…",
    qaVerifyingRound: "Revisando afirmaciones y citas…",
    lastUpdateJustNow: "Última actualización ahora mismo",
    lastUpdateSeconds: "Última actualización hace {n}s",
    lastUpdateMinutes: "Última actualización hace {n} min",
    stallStale:
      "Sin actualizaciones desde hace un rato — el pipeline puede seguir en un paso largo de research.",
    stallStuck:
      "Este cribado parece parado (sin progreso en varios minutos). Puedes intentar reanudarlo.",
    resumeCta: "Reanudar",
    resumeWorking: "Reanudando…",
    resumeFailed: "No se pudo reanudar. Inténtalo de nuevo en un momento.",
    pollTimeout:
      "Dejamos de refrescar tras una espera larga. Reanuda el cribado o recarga la página para comprobar.",
    activity: {
      intake: "Brief confirmado y pasado al pipeline de investigación.",
      hard_data:
        "Cargando el universo de acciones y rankeándolas frente a tu brief.",
      ir_business:
        "Leyendo filings y contexto de negocio — empresa a empresa.",
      web_sentiment:
        "Recopilando noticias y señales de sentimiento con fecha.",
      technicals: "Revisando niveles de precio, tendencia y distancia a máximos/mínimos.",
      portfolio_context: "Comparando candidatos con tu cartera y caja actuales.",
      risk: "Valorando idoneidad y concentración según tu perfil de riesgo.",
      compiler: "Eligiendo los mejores encajes y redactando la shortlist.",
      shortlist_research: "Profundizando la shortlist con research de compañía.",
      qa: "Verificando números, citas y coherencia entre agentes.",
    },
    steps: {
      intake: "Intake",
      hard_data: "Hard data",
      ir_business: "Investigación de negocio",
      web_sentiment: "Web y sentimiento",
      technicals: "Técnico",
      portfolio_context: "Encaje de cartera",
      risk: "Riesgo",
      compiler: "Selección de candidatos",
      shortlist_research: "Research de shortlist",
      qa: "Verificación",
    },
  },
  report: {
    eyebrow: "Informe de investigación · automatizado",
    title: "Candidatos para tu cartera",
    metaLine: "Job {jobId} · {date}",
    methodologyTitle: "Metodología",
    summaryTitle: "Resumen ejecutivo",
    priorityTitle: "Orden de prioridad",
    comparisonTitle: "Tabla comparativa",
    cardsTitle: "Fichas detalladas",
    colTicker: "Ticker",
    colCompany: "Empresa",
    colValuation: "Valoración",
    colGrowth: "Crecimiento",
    colScore: "Score",
    colVerdict: "Veredicto",
    businessTitle: "A qué se dedica",
    employees: "{n} empleados",
    listedSince: "cotiza desde {year}",
    linkWebsite: "Web oficial",
    linkIr: "Relación con inversores",
    linkTrefolio: "Ficha en trefolio",
    catalyst: "Catalizador",
    thesisTitle: "Tesis",
    unmetBriefTitle: "Expectativas del brief no cumplidas",
    unmetBriefHint: "Esta empresa cumplió {met} de {total} filtros evaluables — faltan:",
    risksTitle: "Riesgos",
    sourcesToggle: "Fuentes ({n})",
    metaPrice: "Precio",
    metaTarget: "Objetivo",
    metaFwdPe: "PER fwd",
    metaPe: "PER",
    metaEvEbitda: "EV/EBITDA",
    metaNdEbitda: "ND/EBITDA",
    metaDividend: "Dividendo",
    metaNetCash: "Caja neta",
    metaMoat: "MOAT",
    technicalsTitle: "Técnico",
    metaFromHigh: "Desde máx. 52s",
    metaFromLow: "Desde mín. 52s",
    metaTrend: "Tendencia",
    metaTrendAboveMa200: "Sobre MM200",
    metaTrendBelowMa200: "Bajo MM200",
    metaSupport: "Soporte",
    metaResistance: "Resistencia",
    metaReturn3m: "Rentab. 3m",
    metaReturn1y: "Rentab. 1a",
    metaVolatility: "Volatilidad (an.)",
    yes: "Sí",
    no: "No",
    verdicts: {
      fuerte: "Candidato fuerte",
      watch: "Watch",
      pass: "Descartado",
      fail: "No cumple",
    },
    partialNotice: "Informe parcial — estos agentes todavía no han corrido: {agents}.",
    externalLinksNote:
      "Los enlaces a las compañías y a reguladores se abren fuera de trefolio. No controlamos ni respaldamos su contenido.",
    loadError: "No se pudo cargar el informe.",
    verifiedEmptyError:
      "La verificación no pudo confirmar suficientes afirmaciones de ningún candidato. Inténtalo de nuevo o pide un reembolso desde Perfil.",
    emptyCandidates:
      "Ningún candidato encajó con este brief. Amplía sectores, capitalización o valoración e inténtalo de nuevo.",
    sentimentTitle: "Sentimiento",
    fitRiskTitle: "Encaje y riesgo",
    positionNew: "Posición nueva",
    positionTopUp: "Ampliar existente",
    suitabilityFit: "Encaja",
    suitabilityStretch: "Estira",
    suitabilityPoor: "Mal encaje",
    illustrativeWeight: "Peso ilustrativo {pct}%",
    illustrativeAllocation: "Asignación ilustrativa €{min}–€{max}",
    insiderBuying: "Insiders: sesgo comprador",
    insiderSelling: "Insiders: sesgo vendedor",
    insiderMixed: "Insiders: mixto",
    insiderNone: "Insiders: sin sesgo claro",
    unlockReportChip: "Desbloquear informe",
    lockedCandidate: "Candidato {n}",
    lockedCell: "••••",
    verificationVerified: "Verificado · sin incidencias",
    verificationFlagged:
      "{count} afirmación/es marcada/s para revisión — ver notas por candidato.",
    verificationDegraded:
      "Verificado con reservas · algunas afirmaciones no se pudieron confirmar. Revisa las notas marcadas en cada ficha.",
    verificationExpand: "Ver afirmaciones marcadas",
    verificationCollapse: "Ocultar afirmaciones marcadas",
    verificationTitle: "Verificación",
    verificationRoundLabel: "Ronda {n}",
    verificationIssueTypes: {
      quant_mismatch: "Desajuste cuantitativo",
      unconfirmed_source: "Fuente sin confirmar",
      cross_agent_inconsistency: "Inconsistencia entre agentes",
      rule_violation: "Violación de regla",
      other: "Otro",
    },
    verificationRuleLabels: {
      R1: "R1 — Clasificación de insiders",
      R2: "R2 — Ruido de sentimiento",
      R3: "R3 — Contexto direccional de insiders",
      R4: "R4 — Historial de PER",
      R5: "R5 — Conflicto entre fuentes",
      R6: "R6 — Frescura de guidance",
      R7: "R7 — Causalidad de caídas de precio",
      R8: "R8 — M&A vs crecimiento orgánico",
      R9: "R9 — Filtrado de comparables",
      R10: "R10 — Cobertura de analistas",
    },
    candidateVerifiedBadge: "Verificado",
    candidateFlaggedBadge: "Afirmaciones marcadas",
  },
};

const BY_LANGUAGE: Record<string, ScreeningCopy> = { en, es };

/** Base language of a tag like "es-419" → "es". Unknown languages fall back to English. */
export function getScreeningCopy(language: string | undefined): ScreeningCopy {
  const base = (language || "en").toLowerCase().split("-")[0];
  return BY_LANGUAGE[base] ?? en;
}

/** Replaces {placeholders}. Missing values are left untouched so they surface in review. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
