import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Je hebt deze e-mail ontvangen van trefolio.",
  unsubscribeLabel: "Afmelden"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Realtime koersen",
    intro: "Je portefeuille-dashboard werkt prijzen live bij gedurende de handelsdag — geen handmatige vernieuwing nodig.",
    sectionLabel: "Wat je krijgt:",
    features: [
      {
        title: "60+ beurzen",
        desc: "Prijzen van NYSE, NASDAQ, Euronext, Londen, Frankfurt en meer — powered by Yahoo Finance."
      },
      {
        title: "Auto-vernieuwing",
        desc: "Koersen vernieuwen elke 15 seconden (configureerbaar naar 30s of 60s in je instellingen)."
      },
      {
        title: "Multi-valuta",
        desc: "Bekijk waarden in je lokale valuta. We ondersteunen 21 valuta's met automatische conversie."
      }
    ],
    tierText: "Beschikbaar op alle plannen",
    ctaLabel: "Open je dashboard"
  },
  "feature-dividend-tracking": {
    heading: "Dividendtracking",
    intro: "trefolio detecteert automatisch dividend uit je posities en bouwt een compleet inkomensbeeld op.",
    sectionLabel: "Wat je krijgt:",
    features: [
      {
        title: "Dividendkalender",
        desc: "Bekijk aankomende betalingen maand voor maand. Weet precies wanneer dividend op je rekening binnenkomt."
      },
      {
        title: "Jaarinkomen",
        desc: "Totaal verwacht dividendinkomen over je hele portefeuille met uitsplitsing per aandeel."
      },
      {
        title: "Rendement op kosten",
        desc: "Volg je werkelijke rendement gebaseerd op aankoopprijs — niet alleen het huidige dividendpercentage."
      },
      {
        title: "DRIP-simulatie",
        desc: "Zie hoe herbeleggen van dividend je rendement kan laten groeien over 5, 10 of 20 jaar."
      }
    ],
    tierText: "Beschikbaar op alle plannen",
    ctaLabel: "Bekijk je dividend"
  },
  "feature-ai-analysis": {
    heading: "AI-aandelenanalyse",
    intro: "Vraag onze AI over elk aandeel in je portefeuille of elke ticker die je overweegt. Krijg institutionele kwaliteitsanalyse in seconden.",
    sectionLabel: "Wat je kunt vragen:",
    features: [
      {
        title: "Resultatenanalyse",
        desc: "\"Hoe waren de laatste resultaten van AAPL?\" — samenvatting van resultaten, richtlijnen en marktreactie."
      },
      {
        title: "Risicobeoordeling",
        desc: "\"Wat zijn de risico's van het houden van TSLA?\" — concurrentiebedreigingen, waardering en macrofactoren."
      },
      {
        title: "Concurrentenvergelijking",
        desc: "\"Vergelijk MSFT vs GOOG\" — naast-elkaar analyse van financiën, groei en waardering."
      },
      {
        title: "Portefeuillereview",
        desc: "\"Bekijk mijn portefeuille\" — AI analyseert je allocatie, risico en suggereert verbeteringen."
      }
    ],
    tierText: "Folio: 5 gesprekken/maand | Bifolio: 20/maand | Trefolio: Onbeperkt",
    ctaLabel: "Probeer AI-analyse nu"
  },
  "feature-price-alerts": {
    heading: "Prijsalarmen",
    intro: "Mis nooit een belangrijke prijsbeweging. Stel doelprijzen in en word gewaarschuwd zodra een aandeel je drempel overschrijdt.",
    sectionLabel: "Hoe het werkt:",
    features: [
      {
        title: "Drempelalarmen",
        desc: "Stel \"boven\" of \"onder\" prijsdoelen in. Word gewaarschuwd wanneer een aandeel je lijn overschrijdt."
      },
      {
        title: "Procentveranderingsalarmen",
        desc: "Volg dagelijkse of sinds-aankoop procentveranderingen. Vang dalingen of rally's vroeg."
      },
      {
        title: "Multi-kanaal",
        desc: "E-mail en push-alarmen op Bifolio. Voeg WhatsApp en apparaatalarmen toe op Trefolio."
      },
      {
        title: "Cron-aangedreven",
        desc: "Ons systeem controleert prijzen elke minuut tijdens markturen. Je hoeft nooit het scherm te bewaken."
      }
    ],
    tierText: "Bifolio: Tot 10 alarmen | Trefolio: Onbeperkte alarmen",
    ctaLabel: "Maak je eerste alarm"
  },
  "feature-broker-import": {
    heading: "Portefeuille-import",
    intro: "Handmatig aandelen een voor een toevoegen? Er is een snellere manier. trefolio ondersteunt drie importmethoden om je volledige portefeuille in seconden te krijgen.",
    sectionLabel: "Kies je methode:",
    features: [
      {
        title: "Broker Sync",
        desc: "Verbind je broker en we synchroniseren automatisch je posities, cash en transacties. One-click setup, altijd up-to-date."
      },
      {
        title: "CSV-upload",
        desc: "Exporteer een CSV van je broker en upload het. We ondersteunen 20+ brokerformaten waaronder DEGIRO, Interactive Brokers, Trade Republic en meer."
      },
      {
        title: "AI-import",
        desc: "Upload elk bestand — CSV, PDF of screenshot — en onze AI zet het om in je portefeuille. Werkt zelfs met ongebruikelijke formaten."
      }
    ],
    tierText: "Folio: CSV en Handmatig | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importeer je portefeuille"
  },
  "feature-fundamentals": {
    heading: "Bedrijfsfundamentals",
    intro: "Ga verder dan koersen. trefolio geeft je toegang tot complete bedrijfsfinanci&euml;n — dezelfde data die professionele analisten gebruiken.",
    sectionLabel: "Wat je krijgt:",
    features: [
      {
        title: "Resultatenrekening",
        desc: "Omzet, nettowinst, marges en winst per aandeel — per kwartaal en jaar."
      },
      {
        title: "Balans",
        desc: "Activa, passiva, schuldniveaus en boekwaarde in &eacute;&eacute;n oogopslag."
      },
      {
        title: "Kasstroomoverzicht",
        desc: "Operationele, investerings- en financieringsstromen. Zie of het bedrijf echt cash genereert."
      },
      {
        title: "Insider-transacties",
        desc: "Zie wat bestuurders en directeuren kopen en verkopen."
      },
      {
        title: "Institutionele participaties",
        desc: "Volg wat de grote fondsen bezitten — Vanguard, BlackRock, Fidelity en meer."
      }
    ],
    tierText: "Trefolio Pro exclusief",
    ctaLabel: "Fundamentals verkennen"
  },
  "feature-stock-screener": {
    heading: "Aandelenfilter",
    intro: "Ontdek aandelen die overeenkomen met je beleggingscriteria. Filter 600+ aandelen op meerdere dimensies en pas bewezen strategie&euml;n toe.",
    sectionLabel: "Filter op:",
    features: [
      {
        title: "6 filterdimensies",
        desc: "Marktkapitalisatie, K/W-verhouding, dividendrendement, sector, land en beurs. Combineer zoveel als je wilt."
      },
      {
        title: "5 ingebouwde strategie&euml;n",
        desc: "Waarde-investeren, dividendgroei, momentum, kwaliteit en small-cap — voorinstellingen met &eacute;&eacute;n klik."
      },
      {
        title: "Rijke data",
        desc: "Prijs, verandering %, marktkapitalisatie, K/W, dividendrendement en sector voor elk resultaat."
      },
      {
        title: "Snel toevoegen",
        desc: "Iets interessants gevonden? Voeg het direct vanuit de resultaten toe aan je portefeuille of volglijst."
      }
    ],
    tierText: "Trefolio Pro exclusief",
    ctaLabel: "Filter openen"
  },
  "feature-tax-reports": {
    heading: "Belastingrapporten",
    intro: "Belastingaangifte hoeft niet pijnlijk te zijn. trefolio genereert land-specifieke belastingrapporten en bevat een AI Belastingassistent voor uw vragen.",
    sectionLabel: "Wat je krijgt:",
    features: [
      {
        title: "5 EU-landen",
        desc: "Land-specifieke rapporten voor Duitsland, Frankrijk, Spanje, Nederland en Itali&euml;."
      },
      {
        title: "Winsten en verliezen",
        desc: "Berekende meerwaarden, verliezen en aanhoudingsperiode per positie."
      },
      {
        title: "Dividendinkomen",
        desc: "Bruto dividend, bronbelasting en netto-inkomen per land van herkomst."
      },
      {
        title: "AI Belastingassistent",
        desc: "Stel vragen zoals \"Hoeveel bronbelasting heb ik betaald over Amerikaans dividend?\" en krijg direct antwoord."
      }
    ],
    tierText: "Trefolio Pro exclusief",
    ctaLabel: "Belastingrapport genereren"
  },
  "feature-portfolio-simulator": {
    heading: "Portefeuille simulator",
    intro: "Test je beleggingsidee&euml;n voordat je echt geld inzet. De simulator laat je backtesten, stresstesten en what-if scenario's verkennen.",
    sectionLabel: "Drie modi:",
    features: [
      {
        title: "Backtest",
        desc: "Zie hoe een portefeuille historisch zou hebben gepresteerd. Vergelijk met S&P 500, MSCI World of een aangepaste benchmark."
      },
      {
        title: "Stresstesten",
        desc: "Wat als de markt 30% daalt? En bij stijgende rente? Zie hoe je portefeuille standhoudt onder verschillende scenario's."
      },
      {
        title: "What-if analyse",
        desc: "Voeg posities toe of verwijder ze, wijzig allocaties en zie direct de impact op risico en rendement."
      }
    ],
    tierText: "Trefolio Pro exclusief",
    ctaLabel: "Simulator openen"
  },
  "feature-net-worth": {
    heading: "Vermogensvolging",
    intro: "Je investeringen zijn slechts een deel van je financi&euml;n. Volg alles — vastgoed, spaargeld, pensioenen en meer — op &eacute;&eacute;n plek.",
    sectionLabel: "Wat je kunt volgen:",
    features: [
      {
        title: "Vastgoed",
        desc: "Voeg eigendommen toe met actuele waarde. Werk bij wanneer marktomstandigheden veranderen."
      },
      {
        title: "Spaarrekeningen",
        desc: "Volg contant geld in banken in verschillende valuta's."
      },
      {
        title: "Pensioenen en verzekeringen",
        desc: "Neem pensioenfondsen en levensverzekeringspolissen op in je vermogen."
      },
      {
        title: "Totaal vermogen",
        desc: "Zie alles gecombineerd: aandelen + ETFs + crypto + vastgoed + spaargeld + pensioenen = je complete plaatje."
      }
    ],
    tierText: "Bifolio: Tot 10 activa | Trefolio: Tot 999 activa",
    ctaLabel: "Handmatige activa toevoegen"
  },
  "feature-crypto": {
    heading: "Crypto portefeuille",
    intro: "Volg crypto naast je aandelen en ETFs. Krijg hetzelfde analyse- en insightniveau voor je crypto-posities.",
    sectionLabel: "Wat je krijgt:",
    features: [
      {
        title: "Crypto dashboard",
        desc: "Prijzen, 24u wijzigingen, volume en marktkapitalisatie van topcryptovaluta's."
      },
      {
        title: "Portefeuille tracking",
        desc: "Voeg crypto-posities toe naast aandelen. Zie gecombineerde portefeuillewaarde en allocatie."
      },
      {
        title: "Grafieken en geschiedenis",
        desc: "Prijsgrafieken met meerdere tijdframes en wisselkoersoverlays."
      },
      {
        title: "AI Crypto analyse",
        desc: "Vraag onze AI over elke crypto — fundamenten, trends en marktanalyse."
      }
    ],
    tierText: "Folio: Marktoverzicht | Trefolio: Volledige portefeuille tracking & AI",
    ctaLabel: "Crypto verkennen"
  }
};
