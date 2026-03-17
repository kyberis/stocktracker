import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Du fick detta e-postmeddelande fr&aring;n trefolio.",
  unsubscribeLabel: "Avregistrera"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Realtidskurser",
    intro: "Din portf&ouml;lj&ouml;versikt uppdaterar priser live under hela handelsdagen — ingen manuell uppdatering beh&ouml;vs.",
    sectionLabel: "Vad du f&aring;r:",
    features: [
      {
        title: "60+ b&ouml;rser",
        desc: "Priser fr&aring;n NYSE, NASDAQ, Euronext, London, Frankfurt och mer — powered by Yahoo Finance."
      },
      {
        title: "Auto-uppdatering",
        desc: "Kurser uppdateras var 15:e sekund (konfigurerbart till 30s eller 60s i inst&auml;llningarna)."
      },
      {
        title: "Multi-valuta",
        desc: "Se v&auml;rden i din lokala valuta. Vi st&ouml;der 21 valutor med automatisk konvertering."
      }
    ],
    tierText: "Tillg&aring;nglig i alla planer",
    ctaLabel: "&Ouml;ppna din &ouml;versikt"
  },
  "feature-dividend-tracking": {
    heading: "Dividendsp&aring;rning",
    intro: "trefolio uppt&auml;cker automatiskt dividend fr&aring;n dina innehav och bygger en komplett inkomstbild.",
    sectionLabel: "Vad du f&aring;r:",
    features: [
      {
        title: "Dividendkalender",
        desc: "Se kommande utbetalningar m&aring;nad f&ouml;r m&aring;nad. Vet exakt n&auml;r dividend landar p&aring; ditt konto."
      },
      {
        title: "&Aring;rsinkomst",
        desc: "Total projicerad dividendinkomst &ouml;ver hela portf&ouml;ljen med uppdelning per aktie."
      },
      {
        title: "Avkastning p&aring; kostnad",
        desc: "Sp&aring;ra din verkliga avkastning baserad p&aring; k&ouml;pkurs — inte bara den nuvarande dividendr&aacute;ntan."
      },
      {
        title: "DRIP-simulering",
        desc: "Se hur &aring;terinvestering av dividend kunde &ouml;ka dina avkastningar &ouml;ver 5, 10 eller 20 &aring;r."
      }
    ],
    tierText: "Tillg&aring;nglig i alla planer",
    ctaLabel: "Visa dina dividend"
  },
  "feature-ai-analysis": {
    heading: "AI-aktieanalys",
    intro: "Fråga vår AI om vilken aktie som helst i din portfölj eller vilken ticker du överväger. Få institutionell kvalitetsanalys på sekunder.",
    sectionLabel: "Vad du kan fråga:",
    features: [
      {
        title: "Resultatanalys",
        desc: "\"Hur var AAPLs senaste resultat?\" — sammanfattning av resultat, riktlinjer och marknadsreaktion."
      },
      {
        title: "Riskanalys",
        desc: "\"Vilka är riskerna med att äga TSLA?\" — konkurrenshot, värdering och makrofaktorer."
      },
      {
        title: "Konkurrentjämförelse",
        desc: "\"Jämför MSFT vs GOOG\" — sida vid sida analys av finans, tillväxt och värdering."
      },
      {
        title: "Portföljgranskning",
        desc: "\"Granska min portfölj\" — AI analyserar din allokering, risk och föreslår förbättringar."
      }
    ],
    tierText: "Folio: 5 anrop/mån | Bifolio: 20/mån | Trefolio: Obegränsat",
    ctaLabel: "Prova AI-analys nu"
  },
  "feature-price-alerts": {
    heading: "Prislarm",
    intro: "Missa aldrig en viktig prisrörelse. Sätt målpriser och bli meddelad när en aktie passerar din tröskel.",
    sectionLabel: "Så fungerar det:",
    features: [
      {
        title: "Tröskellarm",
        desc: "Sätt \"över\" eller \"under\" prismål. Bli meddelad när en aktie passerar din linje."
      },
      {
        title: "Procentförändringslarm",
        desc: "Spåra dagliga eller från-köp procentförändringar. Fånga nedgångar eller rallyer tidigt."
      },
      {
        title: "Flerkanal",
        desc: "E-post och push-larm på Bifolio. Lägg till WhatsApp och enhetslarm på Trefolio."
      },
      {
        title: "Cron-driven",
        desc: "Vårt system kontrollerar priser varje minut under marknadstider. Du behöver aldrig titta på skärmen."
      }
    ],
    tierText: "Bifolio: Upp till 10 larm | Trefolio: Obegränsade larm",
    ctaLabel: "Skapa ditt första larm"
  },
  "feature-broker-import": {
    heading: "Portföljimport",
    intro: "Lägger du till aktier manuellt en efter en? Det finns ett snabbare sätt. trefolio stöder tre importmetoder för att få din fullständiga portfölj på sekunder.",
    sectionLabel: "Välj din metod:",
    features: [
      {
        title: "Broker-synk",
        desc: "Anslut din mäklare och vi synkroniserar automatiskt dina innehav, kontanter och transaktioner. Ett-klicks-installation, alltid uppdaterad."
      },
      {
        title: "CSV-uppladdning",
        desc: "Exportera en CSV från din mäklare och ladda upp den. Vi stöder 20+ mäklarformat inklusive DEGIRO, Interactive Brokers, Trade Republic och mer."
      },
      {
        title: "AI-import",
        desc: "Ladda upp vilken fil som helst — CSV, PDF eller skärmdump — och vår AI kommer att omvandla den till din portfölj. Fungerar även med ovanliga format."
      }
    ],
    tierText: "Folio: CSV och Manuell | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importera din portfölj"
  },
  "feature-fundamentals": {
    heading: "Företagsfundamenta",
    intro: "Gå bortom aktiekurser. trefolio ger dig tillgång till kompletta företagsfinanser — samma data som professionella analytiker använder.",
    sectionLabel: "Vad du får:",
    features: [
      {
        title: "Resultaträkning",
        desc: "Intäkter, nettoresultat, marginaler och vinst per aktie — kvartalsvis och årlig."
      },
      {
        title: "Balansräkning",
        desc: "Tillgångar, skulder, skuldnivåer och bokfört värde med en blick."
      },
      {
        title: "Kassaflöde",
        desc: "Operativa, investerings- och finansieringsflöden. Se om företaget genererar verklig likviditet."
      },
      {
        title: "Insideraffärer",
        desc: "Se vad chefer och styrelseledamöter köper och säljer."
      },
      {
        title: "Institutionella innehav",
        desc: "Följ vad de stora fonderna äger — Vanguard, BlackRock, Fidelity och mer."
      }
    ],
    tierText: "Trefolio Pro exklusivt",
    ctaLabel: "Utforska fundamenta"
  },
  "feature-stock-screener": {
    heading: "Aktiefilter",
    intro: "Uppt&auml;ck aktier som matchar dina investeringskriterier. Filtrera 600+ aktier &ouml;ver flera dimensioner och till&auml;mpa bepr&ouml;vade strategier.",
    sectionLabel: "Filtrera p&aring;:",
    features: [
      {
        title: "6 filterdimensioner",
        desc: "B&ouml;rsv&auml;rde, K/V-f&ouml;rh&aring;llande, utdelningsavkastning, sektor, land och b&ouml;rs. Kombinera s&aring; m&aring;nga du vill."
      },
      {
        title: "5 inbyggda strategier",
        desc: "V&auml;rdeinvestering, utdelningsv&auml;xt, momentum, kvalitet och small-cap — f&ouml;rinst&auml;llningar med ett klick."
      },
      {
        title: "Rika data",
        desc: "Pris, f&ouml;r&auml;ndring %, b&ouml;rsv&auml;rde, K/V, utdelningsavkastning och sektor f&ouml;r varje resultat."
      },
      {
        title: "Snabb till&auml;gg",
        desc: "Hittat n&aring;got intressant? L&auml;gg till i portf&ouml;ljen eller bevakningslistan direkt fr&aring;n resultaten."
      }
    ],
    tierText: "Trefolio Pro exklusivt",
    ctaLabel: "&Ouml;ppna filtret"
  },
  "feature-tax-reports": {
    heading: "Skatterapporter",
    intro: "Skattedeklarationer beh&ouml;ver inte vara sm&auml;rtsamma. trefolio genererar landspecifika skatterapporter och inkluderar en AI Skatteassistent f&ouml;r dina fr&aring;gor.",
    sectionLabel: "Vad du f&aring;r:",
    features: [
      {
        title: "5 EU-l&auml;nder",
        desc: "Landspecifika rapporter f&ouml;r Tyskland, Frankrike, Spanien, Nederl&auml;nderna och Italien."
      },
      {
        title: "Vinster och f&ouml;rluster",
        desc: "Ber&auml;knade realisationsvinster, f&ouml;rluster och innehavstid f&ouml;r varje position."
      },
      {
        title: "Utdelningsinkomst",
        desc: "Bruttoutdelningar, k&auml;llskatt och nettoinkomst per ursprungsland."
      },
      {
        title: "AI Skatteassistent",
        desc: "St&auml;ll fr&aring;gor som \"Hur mycket k&auml;llskatt betalade jag p&aring; amerikanska utdelningar?\" och f&aring; omedelbara svar."
      }
    ],
    tierText: "Trefolio Pro exklusivt",
    ctaLabel: "Generera skatterapport"
  },
  "feature-portfolio-simulator": {
    heading: "Portföljsimulator",
    intro: "Testa dina investeringsidéer innan du satsar riktiga pengar. Simulatorn låter dig backtesta, stresstesta och utforska what-if-scenarier.",
    sectionLabel: "Tre lägen:",
    features: [
      {
        title: "Backtest",
        desc: "Se hur en portfölj skulle ha presterat historiskt. Jämför med S&P 500, MSCI World eller en anpassad benchmark."
      },
      {
        title: "Stresstestning",
        desc: "Vad händer om marknaden faller 30%? Och vid stigande räntor? Se hur din portfölj klarar sig under olika scenarier."
      },
      {
        title: "What-if-analys",
        desc: "Lägg till eller ta bort positioner, ändra allokeringar och se omedelbart effekten på risk och avkastning."
      }
    ],
    tierText: "Trefolio Pro exklusivt",
    ctaLabel: "Öppna simulatorn"
  },
  "feature-net-worth": {
    heading: "Förmögenhetsuppföljning",
    intro: "Dina investeringar är bara en del av dina finanser. Följ allt — fastigheter, besparingar, pensioner och mer — på ett ställe.",
    sectionLabel: "Vad du kan följa:",
    features: [
      {
        title: "Fastigheter",
        desc: "Lägg till fastigheter med nuvarande värde. Uppdatera när marknadsförhållandena förändras."
      },
      {
        title: "Sparkonton",
        desc: "Följ kontanter i banker i olika valutor."
      },
      {
        title: "Pensioner och försäkringar",
        desc: "Inkludera pensionsfonder och livförsäkringar i din förmögenhet."
      },
      {
        title: "Total förmögenhet",
        desc: "Se allt kombinerat: aktier + ETFs + krypto + fastigheter + besparingar + pensioner = din kompletta bild."
      }
    ],
    tierText: "Bifolio: Upp till 10 tillgångar | Trefolio: Upp till 999 tillgångar",
    ctaLabel: "Lägg till manuella tillgångar"
  },
  "feature-crypto": {
    heading: "Kryptoportfölj",
    intro: "Följ krypto tillsammans med dina aktier och ETF:er. Få samma analys- och insiktsnivå för dina kryptopositioner.",
    sectionLabel: "Vad du får:",
    features: [
      {
        title: "Krypto-dashboard",
        desc: "Priser, 24h-förändringar, volym och marknadsvärde för toppkryptovalutor."
      },
      {
        title: "Portföljspårning",
        desc: "Lägg till kryptopositioner tillsammans med aktier. Se enhetligt portföljvärde och allokering."
      },
      {
        title: "Diagram och historik",
        desc: "Prisdiagram med flera tidsramar och växelkursöverlägg."
      },
      {
        title: "AI Krypto-analys",
        desc: "Fråga vår AI om vilken krypto som helst — fundamenta, trender och marknadsanalys."
      }
    ],
    tierText: "Folio: Marknadsöversikt | Trefolio: Full portföljspårning och AI",
    ctaLabel: "Utforska krypto"
  }
};
