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
    mockBadge: "Mock data",
    mockNotice:
      "This flow runs on a fixed example report. No market data is fetched and no AI model runs yet, so the candidates are always the same.",
    back: "Back",
    backHome: "Back to home",
    localeNotice:
      "The example report is written in Spanish. Only the sample content is affected, not the interface.",
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
    discoveryEyebrow: "Investment screening",
    discoveryTitle: "Screen candidates for your portfolio",
    discoveryBody:
      "Start from your sector mix: rebalance if something is heavy, or explore freely when the portfolio looks balanced.",
    discoveryCta: "Open screening",
    scenarioPreviewLabel: "Preview entry states",
    scenarioPreviewHint:
      "Temporary switcher for design review. Uses fixture sector weights — not your real portfolio.",
    scenarioEmpty: "New / empty",
    scenarioOverexposed: "Overexposed",
    scenarioBalanced: "Balanced",
    scenarioLive: "Live portfolio",
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
      mockedBadge: "Demo",
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
    eyebrow: "Intake agent",
    title: "Let's define what you are looking for",
    agentName: "Intake agent",
    youLabel: "You",
    briefTitle: "Brief in progress",
    briefEmpty: "Nothing defined yet. Answer or cut the chat short and I will use your preset.",
    briefEarlyHint: "If you cut it short now, I will fill the gaps with your “My screen” preset.",
    finishEarly: "Finish and search",
    pendingOne: "{n} criterion still open",
    pendingMany: "{n} criteria still open",
    explainToggle: "What do these terms mean?",
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
        ask: "Should I apply your “My screen” preset (13 quality and valuation filters) or build it filter by filter?",
        explain: [
          {
            term: "Preset",
            def: "A saved set of filters. “My screen” holds your usual 13 thresholds for quality, debt, valuation and growth.",
          },
          {
            term: "Filter",
            def: "A numeric condition a company must meet to enter the analysis. If it fails, it does not consume research time.",
          },
        ],
        options: {
          applyAll: { label: "Apply My screen", say: "Apply My screen." },
          oneByOne: { label: "Filter by filter", say: "I'd rather go filter by filter." },
        },
      },
      size: {
        ask: "Company size. Your preset uses 300–15,000M USD (small/mid cap). Keep it?",
        explain: [
          {
            term: "Market cap",
            def: "Share price × number of shares: what the whole company costs on the market.",
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
        ask: "Valuation. Preset: forward P/E < 15x, EV/EBITDA < 10x, P/FCF < 15x, EV/Sales < 8x.",
        explain: [
          {
            term: "Forward P/E",
            def: "Price divided by next year's expected earnings per share. 15x means paying 15 years of those earnings. Lower is cheaper — unless earnings are collapsing.",
          },
          {
            term: "EV/EBITDA",
            def: "Enterprise value (market cap + debt − cash) over operating profit before depreciation. It compares companies with different debt loads, which P/E does not.",
          },
          {
            term: "Price / FCF",
            def: "Price over free cash flow per share: the money actually left after investment. Harder to dress up than accounting profit.",
          },
          {
            term: "EV/Sales",
            def: "Enterprise value over revenue. Useful when margins are temporarily crushed and P/E says nothing.",
          },
        ],
        options: {
          keepAll: { label: "Keep all four", say: "Keep the four multiples." },
          stricter: { label: "Stricter: P/E < 12x", say: "Bring the P/E down to 12x." },
          onlyTwo: { label: "Only P/E and P/FCF", say: "P/E and P/FCF are enough." },
        },
      },
      quality: {
        ask: "Quality and balance sheet. Preset: ROIC > 12%, gross margin > 30%, EBIT margin > 12%, ND/EBITDA < 2.5x, current ratio > 1.5x, debt/equity < 100%.",
        explain: [
          {
            term: "ROIC",
            def: "Return on invested capital: how much the company earns per euro employed in the business. Sustained above 12% usually points to a real competitive advantage.",
          },
          {
            term: "Gross margin",
            def: "What is left of each sale after the direct cost of the product. A high margin suggests pricing power.",
          },
          {
            term: "EBIT margin",
            def: "Operating profit over sales, structure costs included. It measures efficiency, not just price.",
          },
          {
            term: "Net debt / EBITDA",
            def: "Years of operating profit needed to repay debt minus cash. Below 2.5x is prudent; negative means net cash.",
          },
          {
            term: "Current ratio",
            def: "Current assets over current liabilities. Above 1.5x there is a cushion for what falls due within twelve months.",
          },
          {
            term: "Debt / equity",
            def: "How much debt there is per euro of own capital. Below 100% financial risk stays contained.",
          },
        ],
        options: {
          keepAll: { label: "Keep everything", say: "Keep the quality filters." },
          netCash: { label: "Require net cash", say: "Only companies with net cash." },
          highRoic: { label: "ROIC > 15%", say: "Raise ROIC to 15%." },
        },
      },
      growth: {
        ask: "Growth. Preset: revenue CAGR FY23→FY26 above 5%.",
        explain: [
          {
            term: "Revenue CAGR",
            def: "Compound annual growth rate: the average pace at which sales grow between two years, already smoothed.",
          },
          {
            term: "Why above 5%",
            def: "It filters out companies that are cheap because the business is shrinking. Cheap and shrinking rarely ends well.",
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
            def: "How many companies get a full card. Each one consumes real research, so more candidates means a longer run.",
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
            def: "Shapes illustrative allocation bands and concentration caps. Conservative keeps single-name weight low; aggressive allows larger illustrative sizes. This is research framing, not advice.",
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
      "Estimated run time is a few minutes: eight agent steps, qualitative research one company at a time, and a verification pass over every claim.",
    runCta: "Run the screen",
    editCta: "Adjust in the chat",
    empty: "The brief is empty. Go back to the chat to define your criteria.",
  },
  progress: {
    eyebrow: "Execution",
    title: "Agents at work",
    body: "Watch each step finish. You can leave this page and come back — nothing is lost.",
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
    failed: "The run failed. Nothing was charged.",
    failedBanner:
      "A step failed — see the agent marked ✕ below. Nothing was charged.",
    failedStepDetail: "Error: {message}",
    irSubtext: "{done}/{total} tickers",
    steps: {
      intake: "Intake — validates the brief",
      hard_data: "Hard Data — universe and multiples (code)",
      ir_business: "IR / Business — one company per invocation",
      web_sentiment: "Web & Sentiment — dated sources",
      portfolio_context: "Portfolio context — fit and overlap",
      risk: "Risk — suitability and concentration",
      compiler: "Compiler — ranking and thesis",
      qa: "QA — rules and citations",
    },
  },
  report: {
    eyebrow: "Research report · automated",
    title: "Candidates for your portfolio",
    metaLine: "Job {jobId} · {date} · {count} candidates",
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
    blurToggleLock: "Preview locked",
    blurToggleUnlock: "Unlock preview",
    blurToggleHint: "Temporary teaser toggle — later tied to credits.",
    unlockReportChip: "Unlock report",
    lockedCandidate: "Candidate {n}",
    lockedCell: "••••",
  },
};

export type ScreeningCopy = typeof en;

const es: ScreeningCopy = {
  common: {
    disclaimerShort: "Investigación automatizada, no asesoramiento financiero.",
    aiLabel: "Generado con IA — puede contener errores",
    mockBadge: "Datos de ejemplo",
    mockNotice:
      "Este flujo funciona con un informe de ejemplo fijo. Todavía no se consultan datos de mercado ni se ejecuta ningún modelo, así que los candidatos son siempre los mismos.",
    back: "Volver",
    backHome: "Volver al inicio",
    localeNotice:
      "El informe de ejemplo está redactado en español. Solo afecta al contenido de muestra, no a la interfaz.",
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
    discoveryEyebrow: "Cribado de inversión",
    discoveryTitle: "Criba candidatos para tu cartera",
    discoveryBody:
      "Parte de tu mezcla por sectores: rebalancea si algo pesa de más, o explora libremente cuando la cartera está equilibrada.",
    discoveryCta: "Abrir cribado",
    scenarioPreviewLabel: "Vista previa de estados",
    scenarioPreviewHint:
      "Selector temporal para revisión de diseño. Usa pesos de ejemplo — no tu cartera real.",
    scenarioEmpty: "Nuevo / vacío",
    scenarioOverexposed: "Sobreexpuesto",
    scenarioBalanced: "Equilibrado",
    scenarioLive: "Cartera real",
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
      mockedBadge: "Demo",
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
    eyebrow: "Agente de intake",
    title: "Definamos qué buscas",
    agentName: "Agente de intake",
    youLabel: "Tú",
    briefTitle: "Brief en construcción",
    briefEmpty: "Todavía sin definir. Responde o corta el chat y uso tu preset.",
    briefEarlyHint: "Si cortas ahora, completo lo que falte con tu preset “Mi cribado”.",
    finishEarly: "Terminar y buscar",
    pendingOne: "{n} criterio por definir",
    pendingMany: "{n} criterios por definir",
    explainToggle: "¿Qué significan estos términos?",
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
        ask: "¿Aplico tu preset “Mi cribado” (13 filtros de calidad y valoración) o lo montamos filtro a filtro?",
        explain: [
          {
            term: "Preset",
            def: "Un conjunto de filtros guardado. “Mi cribado” son tus 13 umbrales habituales de calidad, deuda, valoración y crecimiento.",
          },
          {
            term: "Filtro",
            def: "Una condición numérica que la empresa debe cumplir para entrar en el análisis. Si falla, no gasta tiempo de investigación.",
          },
        ],
        options: {
          applyAll: { label: "Aplica Mi cribado", say: "Aplica Mi cribado." },
          oneByOne: { label: "Filtro a filtro", say: "Prefiero ir filtro a filtro." },
        },
      },
      size: {
        ask: "Tamaño de empresa. Tu preset usa 300–15.000 M USD (small/mid cap). ¿Lo mantengo?",
        explain: [
          {
            term: "Capitalización de mercado",
            def: "Precio de la acción × número de acciones: lo que cuesta la empresa entera en bolsa.",
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
        ask: "Valoración. Preset: PER fwd < 15x, TEV/EBITDA < 10x, P/FCF < 15x, TEV/Ventas < 8x.",
        explain: [
          {
            term: "PER forward",
            def: "Precio dividido entre el beneficio por acción esperado del próximo ejercicio. 15x significa pagar 15 años de ese beneficio. Cuanto más bajo, más barata — salvo que el beneficio se esté hundiendo.",
          },
          {
            term: "TEV/EBITDA",
            def: "Valor total de la empresa (bolsa + deuda − caja) entre su beneficio operativo antes de amortizaciones. Compara empresas con deudas distintas, algo que el PER no hace.",
          },
          {
            term: "Precio / FCF",
            def: "Precio entre el flujo de caja libre por acción: el dinero que sobra de verdad tras invertir. Más difícil de maquillar que el beneficio contable.",
          },
          {
            term: "TEV/Ventas",
            def: "Valor de la empresa entre sus ingresos. Útil cuando el margen está temporalmente hundido y el PER no dice nada.",
          },
        ],
        options: {
          keepAll: { label: "Mantener los cuatro", say: "Mantén los cuatro múltiplos." },
          stricter: { label: "Más estricto: PER < 12x", say: "Bájame el PER a 12x." },
          onlyTwo: { label: "Solo PER y P/FCF", say: "Con PER y P/FCF me vale." },
        },
      },
      quality: {
        ask: "Calidad y balance. Preset: ROIC > 12%, margen bruto > 30%, margen EBIT > 12%, ND/EBITDA < 2,5x, ratio corriente > 1,5x, deuda/fondos propios < 100%.",
        explain: [
          {
            term: "ROIC",
            def: "Retorno sobre el capital invertido: cuánto gana la empresa por cada euro que emplea en el negocio. Por encima del 12% sostenido suele indicar una ventaja competitiva real.",
          },
          {
            term: "Margen bruto",
            def: "Lo que queda de cada venta tras el coste directo del producto. Un margen alto sugiere poder para subir precios.",
          },
          {
            term: "Margen EBIT",
            def: "Beneficio operativo sobre ventas, ya con los gastos de estructura. Mide eficiencia, no solo precio.",
          },
          {
            term: "Deuda neta / EBITDA",
            def: "Años de beneficio operativo que harían falta para devolver la deuda menos la caja. Por debajo de 2,5x es prudente; negativo significa caja neta.",
          },
          {
            term: "Ratio corriente",
            def: "Activo corriente entre pasivo corriente. Por encima de 1,5x hay colchón para pagar lo que vence en doce meses.",
          },
          {
            term: "Deuda / fondos propios",
            def: "Cuánta deuda hay por cada euro de capital propio. Por debajo del 100% el riesgo financiero es contenido.",
          },
        ],
        options: {
          keepAll: { label: "Mantener todo", say: "Mantén los filtros de calidad." },
          netCash: { label: "Exige caja neta", say: "Solo empresas con caja neta." },
          highRoic: { label: "ROIC > 15%", say: "Súbeme el ROIC a 15%." },
        },
      },
      growth: {
        ask: "Crecimiento. Preset: CAGR de ingresos FY23→FY26 por encima del 5%.",
        explain: [
          {
            term: "CAGR de ingresos",
            def: "Tasa de crecimiento anual compuesta: el ritmo medio al que crecen las ventas entre dos ejercicios, ya suavizado.",
          },
          {
            term: "Por qué > 5%",
            def: "Filtra empresas baratas porque el negocio se está encogiendo. Barato y decreciente rara vez acaba bien.",
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
            def: "Define bandas ilustrativas de asignación y topes de concentración. Conservador mantiene poco peso por nombre; agresivo permite tamaños ilustrativos mayores. Es marco de investigación, no consejo.",
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
      "La ejecución estimada son unos minutos: ocho pasos de agente, la investigación cualitativa va empresa por empresa, y una capa de verificación revisa cada afirmación.",
    runCta: "Ejecutar el cribado",
    editCta: "Ajustar en el chat",
    empty: "El brief está vacío. Vuelve al chat para definir tus criterios.",
  },
  progress: {
    eyebrow: "Ejecución",
    title: "Agentes en marcha",
    body: "Mira cómo termina cada paso. Puedes salir y volver — no se pierde nada.",
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
    failed: "La ejecución falló. No se ha cobrado nada.",
    failedBanner:
      "Un paso falló — mira el agente marcado con ✕ abajo. No se ha cobrado nada.",
    failedStepDetail: "Error: {message}",
    irSubtext: "{done}/{total} tickers",
    steps: {
      intake: "Intake — valida el brief",
      hard_data: "Hard Data — universo y múltiplos (código)",
      ir_business: "IR / Negocio — 1 empresa por invocación",
      web_sentiment: "Web & Sentimiento — fuentes con fecha",
      portfolio_context: "Contexto de cartera — encaje y solapamiento",
      risk: "Riesgo — idoneidad y concentración",
      compiler: "Compiler — ranking y tesis",
      qa: "QA — reglas y citas",
    },
  },
  report: {
    eyebrow: "Informe de investigación · automatizado",
    title: "Candidatos para tu cartera",
    metaLine: "Job {jobId} · {date} · {count} candidatos",
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
    blurToggleLock: "Vista previa bloqueada",
    blurToggleUnlock: "Desbloquear vista",
    blurToggleHint: "Toggle temporal del teaser — luego irá ligado a créditos.",
    unlockReportChip: "Desbloquear informe",
    lockedCandidate: "Candidato {n}",
    lockedCell: "••••",
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
