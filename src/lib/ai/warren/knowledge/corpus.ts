/**
 * Curated investing-concepts corpus used by Warren's
 * `searchInvestingKnowledge` tool. Entries are intentionally short
 * (~150-300 words) and avoid buy/sell suggestions: this is reference
 * material the agent paraphrases to the user, not a research blog.
 *
 * Voice and tone: calm, plain language, slightly value-investing leaning.
 * Never quote authors by name. When adding entries:
 *   1. Pick a stable kebab-case slug.
 *   2. Provide an English title + summary; Spanish (`titleEs`/`summaryEs`)
 *      is optional but encouraged.
 *   3. Tag with 2-5 short keywords so the lexical scorer can find it.
 */

export interface KnowledgeEntry {
  slug: string;
  title: string;
  titleEs?: string;
  summary: string;
  summaryEs?: string;
  tags: string[];
  body: string;
}

export const INVESTING_KNOWLEDGE: KnowledgeEntry[] = [
  // ─────────────── Philosophy ───────────────
  {
    slug: "margin-of-safety",
    title: "Margin of safety",
    titleEs: "Margen de seguridad",
    summary:
      "Buy meaningfully below your estimate of intrinsic value so estimation errors and bad luck don't sink you.",
    summaryEs:
      "Compra bastante por debajo de tu estimación de valor intrínseco para que los errores y la mala suerte no te hundan.",
    tags: ["philosophy", "valuation", "graham"],
    body: `Margin of safety means paying clearly less than what an asset is worth on conservative assumptions. The gap absorbs three risks at once: that your valuation is wrong, that the future is worse than expected, and that the market stays irrational longer than you can stay solvent.

For a stock, the "value" anchor is usually a sober estimate of future free cash flows; a 25-40% discount to that anchor is a common starting point. For an index ETF, margin of safety shows up as buying when valuations are not stretched and you hold long enough to ride out a bear market.

The discipline matters more than the precise number. If you only buy when there's a real cushion, average-quality decisions still produce good outcomes over time.`,
  },
  {
    slug: "owner-mindset",
    title: "Owner mindset",
    titleEs: "Mentalidad de dueño",
    summary:
      "Treat each share as a tiny piece of a real business, not a flashing ticker on a screen.",
    summaryEs:
      "Mira cada acción como un trozo pequeño de un negocio real, no como un ticker que parpadea.",
    tags: ["philosophy", "behavioral"],
    body: `An owner mindset asks "would I want to own this whole company for ten years?" before "is the chart pretty?". It pulls attention to durable things: customers, pricing power, capital allocation, debt, management quality. It also frees you from short-term volatility — quarterly noise rarely changes whether the business is healthy.

In practice the mindset shows up as a few simple habits: read at least one annual report before buying, write down why you own each position, and revisit that thesis when fundamentals change, not when the price does.`,
  },
  {
    slug: "mr-market",
    title: "Mr. Market",
    titleEs: "Don Mercado",
    summary:
      "Imagine the market as a moody business partner who shows up daily with a quote — sometimes euphoric, sometimes despondent, never required to be reasonable.",
    summaryEs:
      "Imagina al mercado como un socio caprichoso que cada día te ofrece un precio: a veces eufórico, a veces deprimido, nunca obligado a ser razonable.",
    tags: ["philosophy", "behavioral", "graham"],
    body: `The Mr. Market parable reframes price quotes as offers, not truth. On any given day Mr. Market may be euphoric (offering far above your estimated value) or panicked (offering far below). You're free to transact with him or to ignore him entirely.

The lesson isn't to time these moods — it's to notice that price and value are different. Use Mr. Market when his mood helps you (selling into euphoria, buying into panic about quality businesses) and ignore him otherwise. The worst use of the analogy is letting his mood dictate yours.`,
  },
  {
    slug: "circle-of-competence",
    title: "Circle of competence",
    titleEs: "Círculo de competencia",
    summary:
      "Stick to the businesses, sectors, and instruments you genuinely understand. Size of the circle matters less than knowing its perimeter.",
    summaryEs:
      "Quédate con los negocios y activos que realmente entiendes. Importa más conocer los límites del círculo que su tamaño.",
    tags: ["philosophy", "risk"],
    body: `A circle of competence is the set of investments where you can plausibly judge the durability of a business and the range of likely outcomes. Outside it, even smart analysis is mostly guessing.

Two practical tests: can you explain the company in one paragraph without jargon? Can you name a handful of things that would have to go wrong for the thesis to fail? If either answer is "no", you're outside the circle. The cure isn't always to expand it — sometimes the right answer is "this isn't for me" and a broad index ETF does the job.`,
  },
  {
    slug: "long-termism",
    title: "Long-term thinking",
    titleEs: "Pensar a largo plazo",
    summary:
      "Most of an asset's expected return shows up over years, not weeks. Match your holding period to the source of return.",
    summaryEs:
      "La mayor parte del retorno esperado aparece en años, no en semanas. Adapta tu horizonte a la fuente del retorno.",
    tags: ["philosophy", "compounding"],
    body: `Equity returns come from earnings growth, dividends, and changes in valuation. The first two compound over years; only the third bounces day to day. If your horizon is short, you're mostly betting on multiple expansion — a much noisier game.

Picking a horizon up front (e.g. "I'm not selling unless thesis breaks for at least 3 years") removes a lot of behavioural temptation. It also lets compounding do its job: a 7% real return doubles money in about a decade and quadruples it in two.`,
  },

  // ─────────────── Metrics ───────────────
  {
    slug: "pe-ratio",
    title: "P/E ratio (price to earnings)",
    titleEs: "Ratio PER (precio sobre beneficio)",
    summary:
      "Price divided by earnings per share — a quick read on how many years of current profits the market is willing to pay for.",
    summaryEs:
      "Precio dividido por beneficio por acción — una lectura rápida de cuántos años de beneficios actuales paga el mercado.",
    tags: ["metrics", "valuation"],
    body: `P/E = price / earnings per share. A P/E of 20 means the price is 20× last year's profit; informally, the company would need 20 years of unchanged profits to "earn back" its price.

Useful for comparing similar businesses or tracking a company against its own history, but never alone: P/E is sensitive to one-off accounting items, ignores debt, and is meaningless when earnings are negative. Faster-growing or higher-quality companies usually trade at higher multiples — that's not automatically expensive.

Variants worth knowing: forward P/E (uses next year's expected earnings, more relevant but assumes the forecast is right) and Shiller / cyclically-adjusted P/E (uses 10-year average earnings, smooths cycles).`,
  },
  {
    slug: "pb-ratio",
    title: "P/B ratio (price to book)",
    titleEs: "Ratio P/B (precio sobre valor en libros)",
    summary:
      "Price divided by book value per share. Useful for asset-heavy businesses, less useful when most value is intangible.",
    summaryEs:
      "Precio sobre valor en libros por acción. Útil para negocios con muchos activos tangibles, poco útil cuando el valor es intangible.",
    tags: ["metrics", "valuation"],
    body: `P/B compares market price to accounting book value (assets minus liabilities). Banks, insurers, and capital-intensive industries are often analysed via P/B because their balance sheet is the business.

For software, brands, and asset-light businesses, P/B is misleading: the most valuable assets (R&D, code, brand) are expensed rather than capitalised, so book value understates true economic value. A P/B of 0.8 in a regional bank can be a real bargain; the same ratio in a struggling industrial may signal write-downs ahead.`,
  },
  {
    slug: "peg-ratio",
    title: "PEG ratio",
    titleEs: "Ratio PEG",
    summary:
      "P/E divided by expected earnings growth. A rough way to compare valuations across companies growing at different speeds.",
    summaryEs:
      "PER dividido por crecimiento esperado de beneficios. Una forma rápida de comparar valoraciones a velocidades distintas.",
    tags: ["metrics", "valuation", "growth"],
    body: `PEG = P/E divided by expected annual earnings growth (in percent). PEG ≈ 1 is a folkloric "fair price for fair growth" anchor; PEG well below 1 hints at potential undervaluation; PEG well above 1 demands the growth materialise.

Treat PEG as a sanity check, not a verdict. Earnings growth forecasts are often optimistic; quality, debt, and cash conversion still matter. PEG is most useful when comparing two similar companies whose only obvious difference is growth.`,
  },
  {
    slug: "free-cash-flow",
    title: "Free cash flow (FCF)",
    titleEs: "Flujo de caja libre (FCF)",
    summary:
      "Cash generated by the business after capex — what's actually available for dividends, buybacks, debt repayment, or reinvestment.",
    summaryEs:
      "Caja que genera el negocio después de invertir en activos — lo que realmente queda para dividendos, recompras, deuda o reinversión.",
    tags: ["metrics", "cash-flow"],
    body: `Free cash flow = operating cash flow − capital expenditures. Unlike accounting earnings, it's hard to fake with non-cash adjustments. A company that grows earnings while FCF stagnates often has working-capital or capex problems.

Two ratios that fall out of FCF: FCF yield (FCF / market cap) — a "real" earnings yield; and FCF / net income — cash conversion. Above 80% conversion is usually healthy; consistently below 60% deserves explanation.`,
  },
  {
    slug: "roic",
    title: "Return on invested capital (ROIC)",
    titleEs: "Retorno sobre el capital invertido (ROIC)",
    summary:
      "Operating profit after tax divided by invested capital — the most direct measure of how well a business turns capital into profit.",
    summaryEs:
      "Beneficio operativo después de impuestos dividido por el capital invertido — la medida más directa de calidad del negocio.",
    tags: ["metrics", "quality"],
    body: `ROIC = NOPAT / invested capital, where invested capital is debt + equity − cash. Persistent ROIC well above the company's cost of capital is one of the strongest signals of a durable competitive advantage (a "moat"). 15%+ over a full cycle is the rule of thumb.

ROIC also tells you whether growth creates value. A company that grows by reinvesting at low ROIC is destroying value even while reporting bigger numbers. Pair ROIC with a check that the moat exists and is widening.`,
  },
  {
    slug: "roe",
    title: "Return on equity (ROE)",
    titleEs: "Retorno sobre el patrimonio (ROE)",
    summary:
      "Net income divided by shareholder equity. Useful but easy to inflate with leverage or buybacks.",
    summaryEs:
      "Beneficio neto sobre el patrimonio. Útil pero fácil de inflar con deuda o recompras.",
    tags: ["metrics", "quality"],
    body: `ROE measures what shareholders earn on their share of the balance sheet. High and stable ROE often goes with high quality, but two warnings: heavy debt mechanically raises ROE without improving the underlying business, and aggressive buybacks shrink equity and flatter the ratio.

Dupont decomposition (ROE = margin × asset turnover × leverage) is the cleanest way to see what's actually driving the number. Prefer ROIC for cross-industry comparisons.`,
  },
  {
    slug: "debt-to-equity",
    title: "Debt-to-equity",
    titleEs: "Deuda sobre patrimonio",
    summary:
      "How leveraged a company's balance sheet is. Higher amplifies both returns and the chance of trouble in a downturn.",
    summaryEs:
      "Cuánto apalancado está el balance. Más leverage amplifica retornos y problemas en una crisis.",
    tags: ["metrics", "risk", "balance-sheet"],
    body: `D/E compares total debt to shareholder equity. There's no universal "good" level — utilities and banks naturally run higher than software companies — but two cross-industry signals matter: rising D/E without rising returns, and net debt that exceeds a few years of normalized free cash flow.

Pair D/E with interest coverage (EBIT / interest expense). Coverage above 4-5× through a cycle is generally comfortable; below 2× is a yellow flag in any environment.`,
  },
  {
    slug: "dividend-yield",
    title: "Dividend yield",
    titleEs: "Rentabilidad por dividendo",
    summary:
      "Annual dividend divided by share price. A high yield is sometimes a gift, sometimes a warning that the dividend is about to be cut.",
    summaryEs:
      "Dividendo anual dividido entre el precio. Un yield alto a veces es una oportunidad, a veces una señal de que el dividendo se va a recortar.",
    tags: ["metrics", "dividends", "income"],
    body: `Dividend yield = trailing or forward dividend per share / price. Useful for income planning, but never look at it without the payout ratio and the cash flow trend. A 9% yield from a struggling company tends to disappear once the dividend is cut.

For long-term holders, dividend growth matters more than the starting yield. A 3% yield growing at 8% annually overtakes a flat 6% yield in about 9 years and leaves it far behind after that.`,
  },
  {
    slug: "payout-ratio",
    title: "Payout ratio",
    titleEs: "Ratio de pago de dividendos",
    summary:
      "Share of earnings (or free cash flow) paid out as dividends. Tells you whether the dividend has room to grow or risk of being cut.",
    summaryEs:
      "Porción de beneficios (o flujo de caja) que se reparte como dividendo. Indica si hay margen para subirlo o riesgo de que lo recorten.",
    tags: ["metrics", "dividends"],
    body: `Payout ratio = dividends / earnings (or, more conservatively, dividends / free cash flow). Below 50% usually leaves room for both growth and a cushion in bad years. Above 80% is fragile: a single weak year can force a cut.

Ratios above 100% mean the company is paying dividends out of debt, asset sales, or accounting earnings the cash flow doesn't support. That's rarely sustainable.`,
  },
  {
    slug: "ttwror",
    title: "TTWROR (time-weighted return)",
    titleEs: "TTWROR (rentabilidad ponderada por tiempo)",
    summary:
      "Removes the effect of deposits and withdrawals so you see how the underlying portfolio performed, not how much you happened to invest.",
    summaryEs:
      "Quita el efecto de aportes y retiradas para que veas cómo se ha comportado la cartera, no cuánto invertiste por casualidad.",
    tags: ["metrics", "performance"],
    body: `Time-weighted return splits the period into sub-periods between cash flows, computes each sub-period's return, then chains them together. The result is what a 1 EUR invested at the start would have become — independent of when extra money came in.

This is the right metric for comparing portfolios or benchmarks. It's the wrong metric for measuring your personal financial outcome, because it ignores the fact that your bigger contributions late in life carry more weight in your wallet. For that, use XIRR.`,
  },
  {
    slug: "xirr",
    title: "XIRR (money-weighted return)",
    titleEs: "XIRR (rentabilidad ponderada por dinero)",
    summary:
      "The annualized return that makes the present value of all your cash flows equal zero. Reflects the actual experience of your money.",
    summaryEs:
      "La rentabilidad anualizada que iguala a cero el valor presente de tus flujos. Refleja lo que realmente ha rendido tu dinero.",
    tags: ["metrics", "performance"],
    body: `XIRR (extended internal rate of return) takes the dated list of every contribution and withdrawal plus the current portfolio value and finds the annualized rate that ties them together.

It's the right answer to "how has my money done?". A portfolio that is up 30% but where most of the money arrived right before a 10% drop will show a much lower XIRR than TTWROR — and that's the whole point.`,
  },
  {
    slug: "beta",
    title: "Beta",
    titleEs: "Beta",
    summary:
      "How much a stock moves relative to the overall market. Beta of 1 ≈ market; 1.5 ≈ 50% more volatile; 0.5 ≈ half.",
    summaryEs:
      "Cuánto se mueve una acción respecto al mercado. Beta 1 ≈ mercado; 1,5 ≈ 50% más volátil; 0,5 ≈ la mitad.",
    tags: ["metrics", "risk"],
    body: `Beta is a regression coefficient: a stock with beta 1.5 has historically moved roughly 1.5% for every 1% market move. It's a useful shorthand for short-term volatility but a poor proxy for long-term risk — beta says nothing about whether a business is fragile, debt-loaded, or losing market share.

For diversification, what matters more is correlation (how often two assets move together) than beta on its own.`,
  },

  // ─────────────── Assets ───────────────
  {
    slug: "stocks",
    title: "Stocks (equities)",
    titleEs: "Acciones",
    summary:
      "A claim on a slice of a company's profits and assets. Volatile in any given year, historically the highest-returning major asset class over decades.",
    summaryEs:
      "Una participación en los beneficios y activos de una empresa. Volátil año a año, históricamente la clase de activo que más ha rentado a largo plazo.",
    tags: ["assets", "equities"],
    body: `Owning a stock is owning a fractional piece of a real business. Returns come from earnings growth, dividends, and changes in valuation. Over a single year stocks can fall 30%+; over 20-year rolling windows real returns have historically been positive in most major markets.

For most people, owning a broad basket (an index ETF) of stocks is the lowest-friction way to capture this. Picking individual stocks adds the chance of outperformance and the risk of underperformance, plus the cost of doing the work properly.`,
  },
  {
    slug: "etfs",
    title: "ETFs (exchange-traded funds)",
    titleEs: "ETFs (fondos cotizados)",
    summary:
      "Funds that hold a basket of assets and trade like a single stock. The cheapest, most diversified entry point into most asset classes.",
    summaryEs:
      "Fondos que tienen una cesta de activos y cotizan como una acción. La forma más barata y diversificada de entrar en la mayoría de mercados.",
    tags: ["assets", "etfs", "diversification"],
    body: `An ETF holds the assets of an index (or a defined strategy) and trades intraday on an exchange. Two structural advantages over single stocks: instant diversification across hundreds or thousands of holdings, and very low fees for broad index ETFs (often under 0.20% per year).

Things to compare across ETFs: total expense ratio (TER), replication method (physical vs synthetic), accumulating vs distributing (matters for tax in Europe), domicile (Irish-domiciled UCITS funds are common for European investors), and tracking difference vs the index.`,
  },
  {
    slug: "bonds",
    title: "Bonds",
    titleEs: "Bonos",
    summary:
      "Loans to a government or company that pay regular interest. Lower expected return than stocks, lower drawdowns most of the time.",
    summaryEs:
      "Préstamos a un gobierno o empresa que pagan intereses periódicos. Menos retorno esperado que las acciones y, normalmente, menores caídas.",
    tags: ["assets", "fixed-income"],
    body: `A bond pays a known interest stream and returns principal at maturity. The two main risks are credit risk (the issuer fails to pay) and duration risk (rates rise and the bond's price falls). Long-duration bonds are far more sensitive to interest-rate moves than short-term ones.

In a portfolio bonds historically reduce overall volatility because their returns aren't perfectly correlated with stocks — though that correlation can flip in specific environments (notably 2022, when stocks and bonds fell together).`,
  },
  {
    slug: "reits",
    title: "REITs (real estate investment trusts)",
    titleEs: "REITs / SOCIMIs (sociedades de inversión inmobiliaria)",
    summary:
      "Listed companies that own income-producing real estate and pass most of the rent through as dividends.",
    summaryEs:
      "Empresas cotizadas que poseen inmuebles que generan rentas y reparten la mayor parte como dividendos.",
    tags: ["assets", "real-estate", "income"],
    body: `REITs (and the European SOCIMI / SIIC structures) must pay out most of their taxable income to shareholders, so they typically carry higher dividend yields than the broader market. They give you exposure to property without buying, financing, and managing buildings yourself.

REIT prices are sensitive to long-term interest rates and to the credit cycle. Diversify across sub-types (residential, logistics, retail, healthcare, data centers) — a "REIT index" smooths a lot of single-segment risk.`,
  },
  {
    slug: "crypto-basics",
    title: "Crypto basics",
    titleEs: "Cripto: lo básico",
    summary:
      "Decentralized digital assets with no cash flows. Treat any allocation as a high-volatility, high-uncertainty bet — and size accordingly.",
    summaryEs:
      "Activos digitales descentralizados sin flujos de caja. Cualquier exposición es una apuesta de altísima volatilidad — dimensiónala con cuidado.",
    tags: ["assets", "crypto", "risk"],
    body: `Most crypto assets aren't claims on cash flows; their value rests on adoption, scarcity rules, and network effects rather than on a P&L. That makes traditional valuation tools largely inapplicable and makes price discovery driven by sentiment and flows.

If you choose to hold any, two basic guardrails: keep the position small enough that a 70% drawdown wouldn't wreck the plan, and prefer self-custody or reputable, regulated custodians — exchanges have failed before and will again.`,
  },
  {
    slug: "dividends",
    title: "Dividends",
    titleEs: "Dividendos",
    summary:
      "Cash returned to shareholders out of profits. Reliable when supported by free cash flow and a healthy payout ratio; fragile when not.",
    summaryEs:
      "Efectivo devuelto a los accionistas con cargo a beneficios. Fiable cuando hay flujo de caja y ratio de pago sano; frágil cuando no.",
    tags: ["assets", "dividends", "income"],
    body: `Dividends are one of the two ways businesses return cash to owners (the other is buybacks). They're not "free money" — every euro paid out is one not reinvested in the business — but they impose discipline on management and provide a predictable stream for retirees.

For long-term wealth building, total return (price appreciation plus reinvested dividends) is what matters. A business reinvesting 100% at high ROIC can beat a dividend payer over decades; the right answer depends on what the company can earn on retained capital.`,
  },

  // ─────────────── Risk ───────────────
  {
    slug: "diversification",
    title: "Diversification",
    titleEs: "Diversificación",
    summary:
      "Spreading capital across uncorrelated risks so a single bad outcome can't ruin the whole plan.",
    summaryEs:
      "Repartir el capital entre riesgos poco correlacionados para que un solo desastre no se lleve todo el plan.",
    tags: ["risk", "portfolio-construction"],
    body: `Diversification works because not every asset falls together. Mixing equities, fixed income, geographies, currencies, and sectors smooths the path of returns and reduces the worst-case drawdown without giving up much expected return.

There are limits: in real crises (2008, March 2020) correlations spike — risky assets fall together. That's why diversification across asset classes (stocks ↔ bonds ↔ cash) tends to do more than diversification across 50 stocks in the same sector. The cleanest single move for most portfolios is owning a global equity ETF instead of single-country bets.`,
  },
  {
    slug: "volatility",
    title: "Volatility",
    titleEs: "Volatilidad",
    summary:
      "How much returns swing around their average. Often confused with risk, but only one slice of it.",
    summaryEs:
      "Cuánto oscilan los retornos alrededor de su media. Se confunde con riesgo, pero es solo una parte.",
    tags: ["risk", "metrics"],
    body: `Volatility is usually measured as the standard deviation of returns. It's easy to compute and useful for sizing positions, but it ignores the asymmetry investors actually care about: a stock that quietly compounds at 15% can have similar volatility to one that goes to zero.

Two complements: maximum drawdown (the worst peak-to-trough loss) and downside deviation (volatility of negative returns only). Both are usually more relevant for long-term planning than headline volatility.`,
  },
  {
    slug: "drawdown",
    title: "Drawdown",
    titleEs: "Drawdown (caída desde máximos)",
    summary:
      "The peak-to-trough loss between a previous high and a subsequent low. The single most useful number for stress-testing your tolerance.",
    summaryEs:
      "La caída entre un máximo y el siguiente mínimo. El número más útil para poner a prueba tu tolerancia.",
    tags: ["risk", "metrics"],
    body: `If a portfolio goes from 100k to 60k and back to 100k, the drawdown was 40%. Returning to the prior peak required 67% from the bottom, not 40%. That asymmetry — losses hurt more than gains heal — is why limiting drawdown matters as much as chasing return.

Before committing to an allocation, simulate (or look up) its historical worst drawdown and ask honestly: would I have stayed invested? If the answer is no, the allocation is too aggressive.`,
  },
  {
    slug: "correlation",
    title: "Correlation",
    titleEs: "Correlación",
    summary:
      "How often two assets move together. Diversification benefits depend on assets having low or negative correlation — not just being different names.",
    summaryEs:
      "Con qué frecuencia se mueven juntos dos activos. El beneficio de diversificar depende de tener correlaciones bajas, no solo de tener nombres distintos.",
    tags: ["risk", "metrics", "diversification"],
    body: `Correlation runs from -1 (always opposite) to +1 (always together); 0 means no linear relationship. Owning ten technology stocks looks diversified by ticker count but their pairwise correlations are typically 0.7+ — they often fall together.

Correlations are unstable. They tend to rise toward 1 in a crisis (everyone sells whatever is liquid), which is precisely when you wanted them low. That's why "different asset class" usually beats "different stock in the same asset class" for hedging tail risk.`,
  },
  {
    slug: "currency-risk",
    title: "Currency risk",
    titleEs: "Riesgo de divisa",
    summary:
      "When a holding is denominated in a foreign currency, exchange-rate moves change your return — sometimes more than the asset itself.",
    summaryEs:
      "Cuando una posición está en otra moneda, el tipo de cambio mueve tu retorno — a veces más que el propio activo.",
    tags: ["risk", "fx", "europe"],
    body: `A European investor who buys US equities is implicitly long both stocks and the dollar. In any given year FX moves of 5-15% are normal and can dominate the underlying return. Over very long horizons FX is closer to a wash because real exchange rates mean-revert, but the path can be bumpy.

Practical responses: keep a meaningful allocation in your home currency for nearer-term needs, and consider EUR-hedged ETFs only when the cost of hedging is low and you want pure asset exposure rather than diversification of currencies.`,
  },
  {
    slug: "sequence-risk",
    title: "Sequence-of-returns risk",
    titleEs: "Riesgo de secuencia de retornos",
    summary:
      "When you're withdrawing or contributing, *when* the bad years happen matters as much as the average return.",
    summaryEs:
      "Cuando aportas o retiras, *cuándo* ocurren los años malos importa tanto como la rentabilidad media.",
    tags: ["risk", "retirement", "drawdown"],
    body: `Two retirees with identical 30-year average returns can run out of money or die wealthy depending on when the bad years hit. A nasty drawdown in the first five years of retirement, while you're selling shares to live, depletes the capital that would have compounded for the next 25.

For people in or near retirement the standard mitigations are: keep 1-3 years of spending in cash or short bonds, hold a sensible bond/equity mix, and have a "guardrail" rule that reduces withdrawals after a big down year. For accumulators the same risk works in reverse — early bear markets let you buy more shares cheaply.`,
  },

  // ─────────────── Pitfalls ───────────────
  {
    slug: "fomo",
    title: "FOMO (fear of missing out)",
    titleEs: "FOMO (miedo a perderse algo)",
    summary:
      "Buying because something has already gone up a lot. The cousin of \"this time is different\" and the parent of bag-holding.",
    summaryEs:
      "Comprar porque algo ya ha subido mucho. Primo de \"esta vez es distinto\" y padre de quedarte pillado.",
    tags: ["pitfalls", "behavioral"],
    body: `FOMO inverts the right question. Instead of "what is this worth?" it asks "how much have I already missed?". The answer is always "a lot", because the strongest narrative arrives near the top of the move.

A simple antidote is a rule. Decide in advance, in writing, what would make a position worth opening. If today's price doesn't fit the rule, sit out. The cost of missing one rocket is much less than the cost of buying near the peak of a recurring cycle.`,
  },
  {
    slug: "anchoring",
    title: "Anchoring",
    titleEs: "Sesgo de anclaje",
    summary:
      "Letting an irrelevant reference price (your purchase price, the 52-week high) drive decisions instead of forward-looking value.",
    summaryEs:
      "Dejar que un precio de referencia irrelevante (lo que pagaste, el máximo de 52 semanas) decida por ti en vez del valor a futuro.",
    tags: ["pitfalls", "behavioral"],
    body: `"I'll sell when it gets back to what I paid" is anchoring. The market doesn't know or care what you paid; the right question is whether the asset is worth more or less than its current price from here.

The cleanest reset is to ask: if I held cash today, would I buy this position at today's price? If no, the right action is usually to sell, regardless of where the cost basis sits.`,
  },
  {
    slug: "recency-bias",
    title: "Recency bias",
    titleEs: "Sesgo de actualidad",
    summary:
      "Treating the recent past as the most likely future. Most painful at the start and end of long market cycles.",
    summaryEs:
      "Tratar el pasado reciente como el futuro más probable. Más doloroso al inicio y al final de los ciclos largos.",
    tags: ["pitfalls", "behavioral"],
    body: `After three good years, "stocks always go up" feels obvious; after one bad year, "they're dead this time" feels equally obvious. Both are recency bias. The base rate — equities have positive long-term real returns and have had several long flat decades — is more durable than either narrative.

A monthly review of your investment policy statement (or any one-page plan), independent of how the market is feeling, is a cheap and effective shield.`,
  },
  {
    slug: "market-timing",
    title: "Market timing",
    titleEs: "Hacer market timing",
    summary:
      "Trying to be in the market for ups and out for downs. Easy to describe, very hard to do consistently — and small mistakes are very expensive.",
    summaryEs:
      "Intentar estar dentro en las subidas y fuera en las bajadas. Fácil de decir, muy difícil de lograr — y los errores cuestan caros.",
    tags: ["pitfalls", "behavioral"],
    body: `Most of long-term equity returns historically come from a small number of best days — and those days cluster near bear-market bottoms, exactly when timers tend to be sidelined. Missing the 10 best days in a decade typically halves the return.

For most investors, "time in the market" + automatic monthly contributions outperforms timing attempts. If you must adjust, do it through pre-committed rules (e.g. rebalance back to target weights) rather than gut-feel exits.`,
  },
  {
    slug: "overtrading",
    title: "Overtrading",
    titleEs: "Sobreoperar",
    summary:
      "Each trade adds friction (spread, commission, tax). Frequent activity rarely adds enough alpha to overcome it.",
    summaryEs:
      "Cada operación añade fricción (spread, comisión, impuestos). La actividad frecuente rara vez compensa.",
    tags: ["pitfalls", "behavioral", "costs"],
    body: `Studies of retail brokerage data consistently show that the most active accounts underperform the least active by several percentage points a year. The drag comes partly from costs and partly from selling winners too early and holding losers too long.

A useful question before any trade: would I do this if I had to wait 24 hours, list the reason in writing, and pay double the commission? Most "must do now" trades fail that test.`,
  },

  // ─────────────── Frameworks ───────────────
  {
    slug: "buffett-checklist",
    title: "A simple business checklist",
    titleEs: "Lista de comprobación de un buen negocio",
    summary:
      "Five questions that catch most low-quality investments before they catch you.",
    summaryEs:
      "Cinco preguntas que descartan la mayoría de las inversiones de baja calidad antes de que te atrapen.",
    tags: ["frameworks", "philosophy"],
    body: `1. Do I understand how this business makes money in a single paragraph?
2. Does it have a durable advantage that lets it earn more than the cost of capital across a full cycle?
3. Is management honest and shareholder-aligned (compensation, capital allocation, candor)?
4. Is the balance sheet strong enough to survive a bad year without a forced equity raise?
5. Is the price reasonable relative to a conservative estimate of long-term cash flows?

A "no" or "I don't know" on any item is a reason to stop. A clean five-out-of-five doesn't guarantee a good outcome, but it dramatically tilts the odds.`,
  },
  {
    slug: "graham-screening",
    title: "Defensive screening",
    titleEs: "Cribado defensivo",
    summary:
      "Quantitative filters that cut a universe of thousands of stocks down to a manageable list of survivors.",
    summaryEs:
      "Filtros cuantitativos que reducen miles de acciones a una lista pequeña de supervivientes.",
    tags: ["frameworks", "valuation"],
    body: `A starter screen for boring-but-solid candidates: market cap above a meaningful threshold; positive earnings every year for the last 5-10; rising book value over a decade; current ratio above 1.5; long-term debt below working capital or below 2× equity; P/E below ~15 or below the market median; P/B below ~1.5.

Screens are filters, not verdicts. Anything that survives still needs a qualitative read of the business and the moat. The point is to spend research time on plausible candidates instead of fashionable ones.`,
  },
  {
    slug: "dollar-cost-averaging",
    title: "Dollar-cost averaging (DCA)",
    titleEs: "DCA / aportaciones periódicas",
    summary:
      "Investing a fixed amount on a fixed schedule. Removes timing decisions and converts volatility into a tailwind.",
    summaryEs:
      "Invertir una cantidad fija con una periodicidad fija. Quita las decisiones de timing y convierte la volatilidad en ventaja.",
    tags: ["frameworks", "behavioral"],
    body: `DCA buys more shares when prices are low and fewer when high — your average cost ends up below the simple average price. More importantly, it removes the temptation to "wait for a better moment", which is responsible for most missed long-term returns.

A note on lump sums: if you have a windfall, the historical evidence slightly favours investing it all at once over spreading it (markets rise more often than they fall). DCA's edge is mostly behavioural — and behaviour is most of what matters.`,
  },
  {
    slug: "asset-allocation",
    title: "Asset allocation",
    titleEs: "Asignación de activos",
    summary:
      "The split between stocks, bonds, cash, and other assets. Decides 80%+ of your long-term return and risk.",
    summaryEs:
      "El reparto entre acciones, bonos, efectivo y otros activos. Decide más del 80% de tu retorno y riesgo a largo plazo.",
    tags: ["frameworks", "portfolio-construction"],
    body: `Picking individual stocks gets all the attention but matters far less than the high-level mix. A 100% equity portfolio and a 60/40 stock-bond portfolio behave very differently in every drawdown. Decide on the mix that matches your horizon and stomach first, then worry about what's inside each bucket.

A simple rule of thumb: equity weight ≈ "how many years until I need this money", capped by what would let you sleep through a 40% drawdown. Adjust toward bonds and cash as horizons shorten.`,
  },
  {
    slug: "rebalancing",
    title: "Rebalancing",
    titleEs: "Rebalancear",
    summary:
      "Periodically restoring target weights — sells what's gone up, buys what's gone down. Disciplined, mildly contrarian, and free.",
    summaryEs:
      "Devolver las posiciones a sus pesos objetivo — vende lo que subió, compra lo que bajó. Disciplinado, ligeramente contrario y gratis.",
    tags: ["frameworks", "portfolio-construction"],
    body: `If your target is 70% stocks and a bull market drifts you to 80%, you're now taking more equity risk than you signed up for. Rebalancing pulls weights back to target.

Common cadences: once a year on a fixed date, or whenever a position drifts more than 5 percentage points. Rebalancing tends to add a small amount of return ("rebalance bonus") and reduce volatility, mostly by enforcing "buy low, sell high" without any forecasting required.`,
  },
];
