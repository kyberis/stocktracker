import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Du mottok denne e-posten fra trefolio.",
  unsubscribeLabel: "Avmeld"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Sanntidskurser",
    intro: "Porteføljeoversikten din oppdaterer priser live gjennom hele handelsdagen — ingen manuell oppdatering n&oslash;dvendig.",
    sectionLabel: "Hva du f&aring;r:",
    features: [
      {
        title: "60+ b&oslash;rser",
        desc: "Priser fra NYSE, NASDAQ, Euronext, London, Frankfurt og mer — powered by Yahoo Finance."
      },
      {
        title: "Auto-oppdatering",
        desc: "Kurser oppdateres hvert 15. sekund (konfigurerbart til 30s eller 60s i innstillingene)."
      },
      {
        title: "Multi-valuta",
        desc: "Se verdier i din lokale valuta. Vi st&oslash;tter 21 valutaer med automatisk konvertering."
      }
    ],
    tierText: "",
    ctaLabel: "&Aring;pne oversikten"
  },
  "feature-dividend-tracking": {
    heading: "Dividendesporing",
    intro: "trefolio oppdager automatisk dividend fra beholdningene dine og bygger et komplett inntektsbilde.",
    sectionLabel: "Hva du f&aring;r:",
    features: [
      {
        title: "Dividendekalender",
        desc: "Se kommende utbetalinger m&aring;ned for m&aring;ned. Vet n&oslash;yaktig n&aring;r dividend lander p&aring; kontoen din."
      },
      {
        title: "&Aring;rlig inntekt",
        desc: "Total projisert dividendinntekt p&aring; tvers av hele porteføljen med oppdeling per aksje."
      },
      {
        title: "Avkastning p&aring; kostnad",
        desc: "Spor din reelle avkastning basert p&aring; kjøpspris — ikke bare den nåværende dividendesatsen."
      },
      {
        title: "DRIP-simulering",
        desc: "Se hvordan reinvestering av dividend kunne øke avkastningen din over 5, 10 eller 20 &aring;r."
      }
    ],
    tierText: "",
    ctaLabel: "Se dividendene dine"
  },
  "feature-ai-analysis": {
    heading: "AI-aksjeanalyse",
    intro: "Spør AI-en vår om hvilken som helst aksje i porteføljen din eller hvilken som helst ticker du vurderer. Få institusjonell kvalitetsanalyse på sekunder.",
    sectionLabel: "Hva du kan spørre om:",
    features: [
      {
        title: "Resultatanalyse",
        desc: "\"Hvordan var AAPLs siste resultater?\" — oppsummering av resultater, retningslinjer og markedsreaksjon."
      },
      {
        title: "Risikovurdering",
        desc: "\"Hva er risikoene ved å holde TSLA?\" — konkurransetrusler, verdsettelse og makrofaktorer."
      },
      {
        title: "Konkurrentsammenligning",
        desc: "\"Sammenlign MSFT vs GOOG\" — side-om-side analyse av finans, vekst og verdsettelse."
      },
      {
        title: "Portefølje gjennomgang",
        desc: "\"Gjennomgå porteføljen min\" — AI analyserer allokeringen, risikoen og foreslår forbedringer."
      }
    ],
    tierText: "",
    ctaLabel: "Prøv AI-analyse nå"
  },
  "feature-price-alerts": {
    heading: "Prisvarsler",
    intro: "Gå aldri glipp av en viktig prisbevegelse. Sett målpriser og få varsel i øyeblikket en aksje krysser terskelen din.",
    sectionLabel: "Slik fungerer det:",
    features: [
      {
        title: "Terskelvarsler",
        desc: "Sett \"over\" eller \"under\" pris mål. Få varsel når en aksje krysser linjen din."
      },
      {
        title: "Prosentendringsvarsler",
        desc: "Spor daglige eller fra-kjøp prosentendringer. Fange fall eller oppgang tidlig."
      },
      {
        title: "Flerkanal",
        desc: "E-post, push, WhatsApp og enhetsvarsler."
      },
      {
        title: "Cron-drevet",
        desc: "Vårt system sjekker priser hvert minutt i markeds timer. Du trenger aldri å se på skjermen."
      }
    ],
    tierText: "",
    ctaLabel: "Opprett ditt første varsel"
  },
  "feature-broker-import": {
    heading: "Porteføljeimport",
    intro: "Legger du til aksjer manuelt en etter en? Det finnes en raskere måte. trefolio støtter tre importmetoder for å få hele porteføljen din på sekunder.",
    sectionLabel: "Velg metoden din:",
    features: [
      {
        title: "Broker-synk",
        desc: "Koble til megleren din og vi synkroniserer automatisk beholdningene, kontanter og transaksjoner. Oppsett med ett klikk, alltid oppdatert."
      },
      {
        title: "CSV-opplasting",
        desc: "Eksporter en CSV fra megleren din og last den opp. Vi støtter 20+ meglerformater inkludert DEGIRO, Interactive Brokers, Trade Republic og mer."
      },
      {
        title: "AI-import",
        desc: "Last opp hvilken som helst fil — CSV, PDF eller skjermbilde — og AI-en vår vil gjøre den om til porteføljen din. Fungerer selv med uvanlige formater."
      }
    ],
    tierText: "",
    ctaLabel: "Importer porteføljen din"
  },
  "feature-fundamentals": {
    heading: "Selskapsfundamenta",
    intro: "Gå utover aksjekurser. trefolio gir deg tilgang til komplette selskapsfinansier — samme data som profesjonelle analytikere bruker.",
    sectionLabel: "Hva du får:",
    features: [
      {
        title: "Resultatregnskap",
        desc: "Omsetning, nettoresultat, marginer og inntjening per aksje — kvartalsvis og årlig."
      },
      {
        title: "Balanse",
        desc: "Aktiva, gjeld, gjeldsnivåer og bokført verdi med ett blikk."
      },
      {
        title: "Kontantstrøm",
        desc: "Drifts-, investerings- og finansieringsstrømmer. Se om selskapet genererer ekte kontanter."
      },
      {
        title: "Insider-handel",
        desc: "Se hva ledere og styremedlemmer kjøper og selger."
      },
      {
        title: "Institusjonelle beholdninger",
        desc: "Følg hva de store fondene eier — Vanguard, BlackRock, Fidelity og mer."
      }
    ],
    tierText: "",
    ctaLabel: "Utforsk fundamenta"
  },
  "feature-stock-screener": {
    heading: "Aksjefilter",
    intro: "Oppdag aksjer som matcher investeringskriteriene dine. Filtrer 600+ aksjer på tvers av flere dimensjoner og bruk utprøvde strategier.",
    sectionLabel: "Filtrer etter:",
    features: [
      {
        title: "6 filterdimensjoner",
        desc: "Markedsverdi, K/V-forhold, utbytteavkastning, sektor, land og børs. Kombiner så mange du vil."
      },
      {
        title: "5 innebygde strategier",
        desc: "Verdiinvestering, utbyttevekst, momentum, kvalitet og small-cap — forhåndsinnstillinger med ett klikk."
      },
      {
        title: "Rike data",
        desc: "Pris, endring %, markedsverdi, K/V, utbytteavkastning og sektor for hvert resultat."
      },
      {
        title: "Rask tillegg",
        desc: "Fant noe interessant? Legg det til i porteføljen eller overvåkningslisten direkte fra resultatene."
      }
    ],
    tierText: "",
    ctaLabel: "Åpne filteret"
  },
  "feature-tax-reports": {
    heading: "Skatterapporter",
    intro: "Skatteoppgjør trenger ikke v&aelig;re smertefullt. trefolio genererer landspecifikke skatterapporter og inkluderer en AI Skatteassistent for sp&oslash;rsm&aring;lene dine.",
    sectionLabel: "Hva du f&aring;r:",
    features: [
      {
        title: "5 EU-land",
        desc: "Landspecifikke rapporter for Tyskland, Frankrike, Spanien, Nederland og Italia."
      },
      {
        title: "Gevinster og tap",
        desc: "Beregnet kapitalgevinster, tap og beholdningsperiode for hver posisjon."
      },
      {
        title: "Utdelingsinntekt",
        desc: "Bruttoutbytter, kildeskatt og nettoinntekt etter opprinnelsesland."
      },
      {
        title: "AI Skatteassistent",
        desc: "Still sp&oslash;rsm&aring;l som \"Hvor mye kildeskatt betalte jeg på amerikanske utbytter?\" og f&aring; øyeblikkelige svar."
      }
    ],
    tierText: "",
    ctaLabel: "Generer skatterapport"
  },
  "feature-portfolio-simulator": {
    heading: "Portefølje simulator",
    intro: "Test investeringsideene dine før du forplikter ekte penger. Simulatoren lar deg backteste, stressteste og utforske what-if-scenarier.",
    sectionLabel: "Tre modi:",
    features: [
      {
        title: "Backtest",
        desc: "Se hvordan en portefølje ville ha prestert historisk. Sammenlign med S&P 500, MSCI World eller en tilpasset benchmark."
      },
      {
        title: "Stresstesting",
        desc: "Hva om markedet faller 30%? Og ved stigende renter? Se hvordan porteføljen din tåler forskjellige scenarier."
      },
      {
        title: "What-if analyse",
        desc: "Legg til eller fjern posisjoner, endre allokeringer og se umiddelbart effekten på risiko og avkastning."
      }
    ],
    tierText: "",
    ctaLabel: "Åpne simulatoren"
  },
  "feature-net-worth": {
    heading: "Formueoppfølging",
    intro: "Investeringene dine er bare en del av finansene dine. Følg alt — fast eiendom, sparing, pensjoner og mer — ett sted.",
    sectionLabel: "Hva du kan følge:",
    features: [
      {
        title: "Fast eiendom",
        desc: "Legg til eiendommer med nåværende verdi. Oppdater når markedsforholdene endrer seg."
      },
      {
        title: "Sparekontoer",
        desc: "Følg kontanter i banker på tvers av forskjellige valutaer."
      },
      {
        title: "Pensjoner og forsikringer",
        desc: "Inkluder pensjonsfond og livsforsikringer i formuen din."
      },
      {
        title: "Total formue",
        desc: "Se alt kombinert: aksjer + ETFs + krypto + fast eiendom + sparing + pensjoner = ditt komplette bilde."
      }
    ],
    tierText: "",
    ctaLabel: "Legg til manuelle eiendeler"
  },
  "feature-crypto": {
    heading: "Krypto portefølje",
    intro: "Følg krypto sammen med aksjene og ETF-ene dine. Få samme analyse- og innsiktsnivå for kryptoposisjonene dine.",
    sectionLabel: "Hva du får:",
    features: [
      {
        title: "Krypto dashboard",
        desc: "Priser, 24t endringer, volum og markedsverdi for topp kryptovalutaer."
      },
      {
        title: "Portefølje sporing",
        desc: "Legg til kryptoposisjoner sammen med aksjer. Se samlet porteføljeverdi og allokering."
      },
      {
        title: "Diagrammer og historikk",
        desc: "Prisdiagrammer med flere tidsrammer og valutaoverlegg."
      },
      {
        title: "AI Krypto analyse",
        desc: "Spør AI-en vår om hvilken som helst krypto — fundamentale data, trender og markedsanalyse."
      }
    ],
    tierText: "",
    ctaLabel: "Utforsk krypto"
  }
};
