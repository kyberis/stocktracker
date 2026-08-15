import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Du modtog denne e-mail fra trefolio.",
  unsubscribeLabel: "Afmeld"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Realtidskurser",
    intro: "Din portefølje-dashboard opdaterer priser live gennem hele handelsdagen — ingen manuel opdatering n&oslash;dvendig.",
    sectionLabel: "Hvad du f&aring;r:",
    features: [
      {
        title: "60+ b&oslash;rser",
        desc: "Priser fra NYSE, NASDAQ, Euronext, London, Frankfurt og mere — powered by Yahoo Finance."
      },
      {
        title: "Auto-opdatering",
        desc: "Kurser opdateres hvert 15. sekund (konfigurerbart til 30s eller 60s i indstillingerne)."
      },
      {
        title: "Multi-valuta",
        desc: "Se v&aelig;rdier i din lokale valuta. Vi underst&oslash;tter 21 valutaer med automatisk konvertering."
      }
    ],
    tierText: "",
    ctaLabel: "&Aring;bn din dashboard"
  },
  "feature-dividend-tracking": {
    heading: "Dividendesporing",
    intro: "trefolio opdager automatisk dividend fra dine beholdninger og bygger et komplet indkomstbillede.",
    sectionLabel: "Hvad du f&aring;r:",
    features: [
      {
        title: "Dividendekalender",
        desc: "Se kommende udbetalinger m&aring;ned for m&aring;ned. Ved pr&aelig;cis hvorn&aring;r dividend lander p&aring; din konto."
      },
      {
        title: "&Aring;rlig indkomst",
        desc: "Total projiceret dividendindkomst p&aring; tv&aelig;rs af hele porteføljen med opdeling pr. aktie."
      },
      {
        title: "Afkast p&aring; omkostninger",
        desc: "Spor din reelle afkast baseret p&aring; k&oslash;bspris — ikke kun den nuv&aelig;rende dividendrate."
      },
      {
        title: "DRIP-simulering",
        desc: "Se hvordan geninvestering af dividend kunne for&oslash;ge dine afkast over 5, 10 eller 20 &aring;r."
      }
    ],
    tierText: "",
    ctaLabel: "Se dine dividend"
  },
  "feature-ai-analysis": {
    heading: "AI-aktieanalyse",
    intro: "Spørg vores AI om enhver aktie i din portefølje eller enhver ticker du overvejer. Få institutionel kvalitetsanalyse på sekunder.",
    sectionLabel: "Hvad du kan spørge om:",
    features: [
      {
        title: "Resultatanalyse",
        desc: "\"Hvordan var AAPLs seneste resultater?\" — opsummering af resultater, retningslinjer og markedsreaktion."
      },
      {
        title: "Risikovurdering",
        desc: "\"Hvad er risiciene ved at holde TSLA?\" — konkurrenttrusler, værdiansættelse og makrofaktorer."
      },
      {
        title: "Konkurrentsammenligning",
        desc: "\"Sammenlign MSFT vs GOOG\" — side-om-side analyse af finans, vækst og værdiansættelse."
      },
      {
        title: "Porteføljegennemgang",
        desc: "\"Gennemgå min portefølje\" — AI analyserer din allokering, risiko og foreslår forbedringer."
      }
    ],
    tierText: "",
    ctaLabel: "Prøv AI-analyse nu"
  },
  "feature-price-alerts": {
    heading: "Prisalarm",
    intro: "Gå aldrig glip af en vigtig prisbevægelse. Sæt målpriser og få besked det øjeblik en aktie krydser din tærskel.",
    sectionLabel: "Sådan fungerer det:",
    features: [
      {
        title: "Tærskelalarm",
        desc: "Sæt \"over\" eller \"under\" pris mål. Få besked når en aktie krydser din linje."
      },
      {
        title: "Procentændringsalarm",
        desc: "Spor daglige eller fra-køb procentændringer. Fange fald eller stigninger tidligt."
      },
      {
        title: "Multi-kanal",
        desc: "E-mail, push, WhatsApp og enhedsalarmer."
      },
      {
        title: "Cron-drevet",
        desc: "Vores system tjekker priser hvert minut i markeds timer. Du behøver aldrig at se skærmen."
      }
    ],
    tierText: "",
    ctaLabel: "Opret din første alarm"
  },
  "feature-broker-import": {
    heading: "Porteføljeimport",
    intro: "Tilføjer du aktier manuelt en efter en? Der er en hurtigere måde. trefolio understøtter tre importmetoder for at få din fulde portefølje på sekunder.",
    sectionLabel: "Vælg din metode:",
    features: [
      {
        title: "Broker-synk",
        desc: "Forbind din mægler og vi synkroniserer automatisk dine beholdninger, kontanter og transaktioner. Et-kliks opsætning, altid opdateret."
      },
      {
        title: "CSV-upload",
        desc: "Eksporter en CSV fra din mægler og upload den. Vi understøtter 20+ mæglerformater inkl. DEGIRO, Interactive Brokers, Trade Republic og mere."
      },
      {
        title: "AI-import",
        desc: "Upload enhver fil — CSV, PDF eller skærmbillede — og vores AI vil omdanne den til din portefølje. Virker selv med usædvanlige formater."
      }
    ],
    tierText: "",
    ctaLabel: "Importer din portefølje"
  },
  "feature-fundamentals": {
    heading: "Virksomhedens fundamentale data",
    intro: "Gå ud over aktiekurser. trefolio giver dig adgang til komplette virksomhedsfinansier — de samme data som professionelle analytikere bruger.",
    sectionLabel: "Hvad du får:",
    features: [
      {
        title: "Resultatopgørelse",
        desc: "Omsætning, nettoresultat, margener og indtjening pr. aktie — kvartalsvis og årlig."
      },
      {
        title: "Balance",
        desc: "Aktiver, passiver, gældsniveauer og bogført værdi med et blik."
      },
      {
        title: "Pengestrøm",
        desc: "Drifts-, investerings- og finansieringsstrømme. Se om virksomheden genererer rigtig likviditet."
      },
      {
        title: "Insider-handel",
        desc: "Se hvad ledere og bestyrelsesmedlemmer køber og sælger."
      },
      {
        title: "Institutionelle beholdninger",
        desc: "Følg hvad de store fonde ejer — Vanguard, BlackRock, Fidelity og mere."
      }
    ],
    tierText: "",
    ctaLabel: "Udforsk fundamentale data"
  },
  "feature-stock-screener": {
    heading: "Aktiefilter",
    intro: "Opdag aktier der matcher dine investeringskriterier. Filtrer 600+ aktier p&aring; tv&aelig;rs af flere dimensioner og anvend afpr&oslash;vede strategier.",
    sectionLabel: "Filtrer efter:",
    features: [
      {
        title: "6 filterdimensioner",
        desc: "Markedsv&aelig;rdi, K/V-forhold, udbytteafkastning, sektor, land og b&oslash;rs. Kombiner s&aring; mange du vil."
      },
      {
        title: "5 indbyggede strategier",
        desc: "V&aelig;rdiinvestering, udbyttev&aelig;kst, momentum, kvalitet og small-cap — forudindstillinger med et klik."
      },
      {
        title: "Rige data",
        desc: "Pris, &aelig;ndring %, markedsv&aelig;rdi, K/V, udbytteafkastning og sektor for hvert resultat."
      },
      {
        title: "Hurtig tilf&oslash;jelse",
        desc: "Fundet noget interessant? Tilf&oslash;j det til din portef&oslash;lje eller overv&aring;gningsliste direkte fra resultaterne."
      }
    ],
    tierText: "",
    ctaLabel: "&Aring;bn filteret"
  },
  "feature-tax-reports": {
    heading: "Skatterapporter",
    intro: "Skatteindberetninger beh&oslash;ver ikke v&aelig;re smertefulde. trefolio genererer landspecifikke skatterapporter og inkluderer en AI Skatteassistent til dine sp&oslash;rgsm&aring;l.",
    sectionLabel: "Hvad du f&aring;r:",
    features: [
      {
        title: "5 EU-lande",
        desc: "Landspecifikke rapporter for Tyskland, Frankrig, Spanien, Holland og Italien."
      },
      {
        title: "Gevinster og tab",
        desc: "Beregnet kapitalgevinster, tab og beholdningsperiode for hver position."
      },
      {
        title: "Udbydningsindkomst",
        desc: "Bruttoudbytter, kildeskat og nettindkomst efter oprindelsesland."
      },
      {
        title: "AI Skatteassistent",
        desc: "Still sp&oslash;rgsm&aring;l som \"Hvor meget kildeskat betalte jeg af amerikanske udbytter?\" og f&aring; øjeblikkelige svar."
      }
    ],
    tierText: "",
    ctaLabel: "Generer skatterapport"
  },
  "feature-portfolio-simulator": {
    heading: "Portefølje simulator",
    intro: "Test dine investeringsideer, før du forpligter rigtige penge. Simulatoren lader dig backteste, stressteste og udforske what-if scenarier.",
    sectionLabel: "Tre tilstande:",
    features: [
      {
        title: "Backtest",
        desc: "Se hvordan en portefølje ville have klaret sig historisk. Sammenlign med S&P 500, MSCI World eller en tilpasset benchmark."
      },
      {
        title: "Stresstest",
        desc: "Hvad hvis markedet falder 30%? Og ved stigende renter? Se hvordan din portefølje klarer sig under forskellige scenarier."
      },
      {
        title: "What-if analyse",
        desc: "Tilføj eller fjern positioner, ændr allokeringer og se øjeblikkeligt effekten på risiko og afkast."
      }
    ],
    tierText: "",
    ctaLabel: "Åbn simulatoren"
  },
  "feature-net-worth": {
    heading: "Formueopfølging",
    intro: "Dine investeringer er kun en del af dine finanser. Følg alt — fast ejendom, opsparinger, pensioner og mere — ét sted.",
    sectionLabel: "Hvad du kan følge:",
    features: [
      {
        title: "Fast ejendom",
        desc: "Tilføj ejendomme med nuværende værdi. Opdater når markedsforholdene ændrer sig."
      },
      {
        title: "Opsparingskonti",
        desc: "Følg kontanter i banker på tværs af forskellige valutaer."
      },
      {
        title: "Pensioner og forsikringer",
        desc: "Inkluder pensionsfonde og livsforsikringer i din formue."
      },
      {
        title: "Total formue",
        desc: "Se alt kombineret: aktier + ETFs + krypto + fast ejendom + opsparinger + pensioner = dit komplette billede."
      }
    ],
    tierText: "",
    ctaLabel: "Tilføj manuelle aktiver"
  },
  "feature-crypto": {
    heading: "Krypto portefølje",
    intro: "Følg krypto sammen med dine aktier og ETF'er. Få samme analyse- og indsigtsniveau for dine kryptopositioner.",
    sectionLabel: "Hvad du får:",
    features: [
      {
        title: "Krypto dashboard",
        desc: "Priser, 24t ændringer, volumen og markedsværdi for top kryptovalutaer."
      },
      {
        title: "Portefølje sporing",
        desc: "Tilføj kryptopositioner sammen med aktier. Se samlet porteføljeværdi og allokering."
      },
      {
        title: "Diagrammer og historik",
        desc: "Prisdiagrammer med flere tidsrammer og valutakurs-overlays."
      },
      {
        title: "AI Krypto analyse",
        desc: "Spørg vores AI om enhver krypto — fundamentale data, trender og markedsanalyse."
      }
    ],
    tierText: "",
    ctaLabel: "Udforsk krypto"
  }
};
