import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Sie haben diese E-Mail von trefolio erhalten.",
  unsubscribeLabel: "Abmelden"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Echtzeit-Kurse",
    intro: "Ihr Portfolio-Dashboard aktualisiert die Preise live w&auml;hrend des Handelstages — kein manuelles Aktualisieren n&ouml;tig.",
    sectionLabel: "Was Sie erhalten:",
    features: [
      {
        title: "60+ B&ouml;rsen",
        desc: "Preise von NYSE, NASDAQ, Euronext, London, Frankfurt und mehr — powered by Yahoo Finance."
      },
      {
        title: "Auto-Aktualisierung",
        desc: "Kurse aktualisieren sich alle 15 Sekunden (konfigurierbar auf 30s oder 60s in Ihren Einstellungen)."
      },
      {
        title: "Multi-W&auml;hrung",
        desc: "Sehen Sie Werte in Ihrer lokalen W&auml;hrung. Wir unterst&uuml;tzen 21 W&auml;hrungen mit automatischer Umrechnung."
      }
    ],
    tierText: "Verf&uuml;gbar in allen Pl&auml;nen",
    ctaLabel: "Dashboard &ouml;ffnen"
  },
  "feature-dividend-tracking": {
    heading: "Dividenden-Tracking",
    intro: "trefolio erkennt automatisch Dividenden aus Ihren Positionen und erstellt ein vollst&auml;ndiges Einkommensbild.",
    sectionLabel: "Was Sie erhalten:",
    features: [
      {
        title: "Dividendenkalender",
        desc: "Sehen Sie anstehende Zahlungen Monat f&uuml;r Monat. Wissen Sie genau, wann Dividenden auf Ihrem Konto landen."
      },
      {
        title: "Jahreseinkommen",
        desc: "Gesamtprognostizierte Dividendeneinnahmen &uuml;ber Ihr gesamtes Portfolio mit Aufschl&uuml;sselung pro Aktie."
      },
      {
        title: "Rendite auf Kosten",
        desc: "Verfolgen Sie Ihre echte Rendite basierend auf dem Kaufpreis — nicht nur die aktuelle Dividendenrate."
      },
      {
        title: "DRIP-Simulation",
        desc: "Sehen Sie, wie die Reinvestition von Dividenden Ihre Renditen &uuml;ber 5, 10 oder 20 Jahre steigern k&ouml;nnte."
      }
    ],
    tierText: "Verf&uuml;gbar in allen Pl&auml;nen",
    ctaLabel: "Dividenden anzeigen"
  },
  "feature-ai-analysis": {
    heading: "KI-Aktienanalyse",
    intro: "Fragen Sie unsere KI zu jeder Aktie in Ihrem Portfolio oder jedem Ticker, den Sie in Betracht ziehen. Erhalten Sie institutielle Qualit&auml;tsanalyse in Sekunden.",
    sectionLabel: "Was Sie fragen k&ouml;nnen:",
    features: [
      {
        title: "Ergebnisanalyse",
        desc: "\"Wie waren AAPLs letzte Ergebnisse?\" — Zusammenfassung von Ergebnissen, Prognosen und Marktreaktion."
      },
      {
        title: "Risikobewertung",
        desc: "\"Was sind die Risiken von TSLA?\" — Wettbewerbsbedrohungen, Bewertung und Makrofaktoren."
      },
      {
        title: "Wettbewerbsvergleich",
        desc: "\"Vergleiche MSFT vs GOOG\" — Gegen&uuml;berstellung von Finanzen, Wachstum und Bewertung."
      },
      {
        title: "Portfolio-Review",
        desc: "\"Pr&uuml;fe mein Portfolio\" — KI analysiert Ihre Allokation, Risiko und schl&auml;gt Verbesserungen vor."
      }
    ],
    tierText: "Folio: 5 Anrufe/Monat | Bifolio: 20/Monat | Trefolio: Unbegrenzt",
    ctaLabel: "KI-Analyse jetzt ausprobieren"
  },
  "feature-price-alerts": {
    heading: "Preisalarmen",
    intro: "Verpassen Sie nie eine wichtige Preisbewegung. Setzen Sie Zielpreise und werden Sie benachrichtigt, sobald eine Aktie Ihre Schwelle überschreitet.",
    sectionLabel: "So funktioniert es:",
    features: [
      {
        title: "Schwellen-Alarme",
        desc: "Setzen Sie \"über\" oder \"unter\" Preisziele. Werden Sie benachrichtigt, wenn eine Aktie Ihre Linie überschreitet."
      },
      {
        title: "Prozentänderungs-Alarme",
        desc: "Verfolgen Sie tägliche oder kaufbezogene Prozentänderungen. Fangen Sie Einbrüche oder Rallyes früh."
      },
      {
        title: "Multi-Kanal",
        desc: "E-Mail- und Push-Alarme auf Bifolio. WhatsApp und Gerätealarme auf Trefolio."
      },
      {
        title: "Cron-gesteuert",
        desc: "Unser System prüft Preise jede Minute während der Handelszeiten. Sie müssen nie den Bildschirm beobachten."
      }
    ],
    tierText: "Bifolio: Bis zu 10 Alarme | Trefolio: Unbegrenzte Alarme",
    ctaLabel: "Ersten Alarm erstellen"
  },
  "feature-broker-import": {
    heading: "Portfolio-Import",
    intro: "Aktien manuell einzeln hinzuf&uuml;gen? Es geht schneller. trefolio unterst&uuml;tzt drei Importmethoden, um Ihr vollst&auml;ndiges Portfolio in Sekunden zu erhalten.",
    sectionLabel: "W&auml;hlen Sie Ihre Methode:",
    features: [
      {
        title: "Broker-Sync",
        desc: "Verbinden Sie Ihr Depot und wir synchronisieren automatisch Ihre Positionen, Bargeld und Transaktionen. Ein-Klick-Setup, immer aktuell."
      },
      {
        title: "CSV-Upload",
        desc: "Exportieren Sie eine CSV von Ihrem Broker und laden Sie sie hoch. Wir unterst&uuml;tzen 20+ Brokerformate inkl. DEGIRO, Interactive Brokers, Trade Republic und mehr."
      },
      {
        title: "AI-Import",
        desc: "Laden Sie jede Datei hoch — CSV, PDF oder Screenshot — und unsere KI wandelt sie in Ihr Portfolio um. Funktioniert auch mit ungew&ouml;hnlichen Formaten."
      }
    ],
    tierText: "Folio: CSV &amp; Manuell | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Portfolio importieren"
  },
  "feature-fundamentals": {
    heading: "Unternehmensfundamentals",
    intro: "Gehen Sie &uuml;ber Aktienkurse hinaus. trefolio gibt Ihnen Zugang zu vollst&auml;ndigen Unternehmensfinanzen — dieselben Daten wie professionelle Analysten.",
    sectionLabel: "Was Sie erhalten:",
    features: [
      {
        title: "Gewinn- und Verlustrechnung",
        desc: "Umsatz, Nettogewinn, Margen und Gewinn je Aktie — viertelj&auml;hrlich und j&auml;hrlich."
      },
      {
        title: "Bilanz",
        desc: "Verm&ouml;gen, Verbindlichkeiten, Schuldenstand und Buchwert auf einen Blick."
      },
      {
        title: "Kapitalflussrechnung",
        desc: "Operative, Investitions- und Finanzierungsstr&ouml;me. Sehen Sie, ob das Unternehmen echtes Cash generiert."
      },
      {
        title: "Insider-Gesch&auml;fte",
        desc: "Sehen Sie, was F&uuml;hrungskr&auml;fte und Direktoren kaufen und verkaufen."
      },
      {
        title: "Institutionelle Beteiligungen",
        desc: "Verfolgen Sie, was die gro&szlig;en Fonds besitzen — Vanguard, BlackRock, Fidelity und mehr."
      }
    ],
    tierText: "Trefolio Pro exklusiv",
    ctaLabel: "Fundamentals erkunden"
  },
  "feature-stock-screener": {
    heading: "Aktienfilter",
    intro: "Entdecken Sie Aktien, die Ihren Anlagekriterien entsprechen. Filtern Sie 600+ Aktien &uuml;ber mehrere Dimensionen und wenden Sie bew&auml;hrte Strategien an.",
    sectionLabel: "Filtern nach:",
    features: [
      {
        title: "6 Filterdimensionen",
        desc: "Marktkapitalisierung, KGV, Dividendenrendite, Sektor, Land und B&ouml;rse. Kombinieren Sie so viele Sie m&ouml;chten."
      },
      {
        title: "5 integrierte Strategien",
        desc: "Value-Investing, Dividendenwachstum, Momentum, Qualit&auml;t und Small-Cap — Ein-Klick-Voreinstellungen."
      },
      {
        title: "Umfangreiche Daten",
        desc: "Preis, &Auml;nderung %, Marktkapitalisierung, KGV, Dividendenrendite und Sektor f&uuml;r jedes Ergebnis."
      },
      {
        title: "Schnell hinzuf&uuml;gen",
        desc: "Etwas Interessantes gefunden? F&uuml;gen Sie es direkt aus den Ergebnissen zu Ihrem Portfolio oder Ihrer Watchlist hinzu."
      }
    ],
    tierText: "Trefolio Pro exklusiv",
    ctaLabel: "Filter &ouml;ffnen"
  },
  "feature-moat-screener": {
    heading: "Moat-Screener",
    intro: "Filtern Sie Hunderte von Aktien, die bereits eine Moat-&auml;hnliche Bewertung tragen &mdash; acht Kriterien in der Tradition dessen, wie erfahrene Anleger &uuml;ber langlebige Gesch&auml;fte denken.",
    sectionLabel: "Was Sie erhalten:",
    features: [
      {
        title: "&Uuml;ber 680 vorab bewertete Titel",
        desc: "Ein gemeinsam genutztes Universum von Bewertungen, fortlaufend aktualisiert, damit Sie nicht bei null starten."
      },
      {
        title: "Acht Kriterien auf einen Blick",
        desc: "Jede Aktie zeigt bestehen, Warnung oder nicht bestehen &uuml;ber die gesamte Pr&uuml;fliste &mdash; Ertragsqualit&auml;t, Margen, Eigenkapitalrendite, Verschuldung und mehr."
      },
      {
        title: "Filter nach Ihrer Strategie",
        desc: "Mindestscore, Sektor und KGV &mdash; kombinieren Sie Filter, um Ideen zu finden, die zu Ihrem Ansatz passen."
      },
      {
        title: "So &ouml;ffnen Sie es",
        desc: "&Ouml;ffnen Sie <strong>Tools &rarr; Aktienbewertung</strong> und w&auml;hlen Sie den Reiter <strong>Moat-Screener</strong>."
      }
    ],
    tierText: "Trefolio Pro exklusiv",
    ctaLabel: "Aktienbewertung &ouml;ffnen"
  },
  "feature-tax-reports": {
    heading: "Steuerberichte",
    intro: "Steuererkl&auml;rungen m&uuml;ssen nicht schmerzhaft sein. trefolio erstellt l&auml;nderspezifische Steuerberichte und enth&auml;lt einen KI-Steuerassistenten f&uuml;r Ihre Fragen.",
    sectionLabel: "Was Sie erhalten:",
    features: [
      {
        title: "5 EU-L&auml;nder",
        desc: "L&auml;nderspezifische Berichte f&uuml;r Deutschland, Frankreich, Spanien, die Niederlande und Italien."
      },
      {
        title: "Gewinne und Verluste",
        desc: "Berechnete Kapitalgewinne, Verluste und Haltefrist f&uuml;r jede Position."
      },
      {
        title: "Dividendeneinkommen",
        desc: "Bruttodividenden, Quellensteuer und Nettoeinkommen nach Herkunftsland."
      },
      {
        title: "KI-Steuerassistent",
        desc: "Stellen Sie Fragen wie \"Wie viel Quellensteuer habe ich auf US-Dividenden gezahlt?\" und erhalten Sie sofortige Antworten."
      }
    ],
    tierText: "Trefolio Pro exklusiv",
    ctaLabel: "Steuerbericht erstellen"
  },
  "feature-portfolio-simulator": {
    heading: "Portfolio-Simulator",
    intro: "Testen Sie Ihre Anlageideen, bevor Sie echtes Geld einsetzen. Der Simulator erm&ouml;glicht Backtests, Stresstests und die Erkundung von What-if-Szenarien.",
    sectionLabel: "Drei Modi:",
    features: [
      {
        title: "Backtest",
        desc: "Sehen Sie, wie ein Portfolio historisch performt h&auml;tte. Vergleichen Sie mit S&P 500, MSCI World oder einem benutzerdefinierten Benchmark."
      },
      {
        title: "Stresstests",
        desc: "Was, wenn der Markt um 30 % f&auml;llt? Was bei steigenden Zinsen? Sehen Sie, wie Ihr Portfolio unter verschiedenen Szenarien abschneidet."
      },
      {
        title: "What-if-Analyse",
        desc: "F&uuml;gen Sie Positionen hinzu oder entfernen Sie sie, &auml;ndern Sie die Allokation und sehen Sie sofort die Auswirkung auf Risiko und Rendite."
      }
    ],
    tierText: "Trefolio Pro exklusiv",
    ctaLabel: "Simulator &ouml;ffnen"
  },
  "feature-net-worth": {
    heading: "Verm&ouml;gensverfolgung",
    intro: "Ihre Investitionen sind nur ein Teil Ihrer Finanzen. Verfolgen Sie alles — Immobilien, Ersparnisse, Renten und mehr — an einem Ort.",
    sectionLabel: "Was Sie verfolgen k&ouml;nnen:",
    features: [
      {
        title: "Immobilien",
        desc: "F&uuml;gen Sie Immobilien mit aktuellem Wert hinzu. Aktualisieren Sie bei &Auml;nderung der Marktbedingungen."
      },
      {
        title: "Sparkonten",
        desc: "Verfolgen Sie Bargeld in Banken in verschiedenen W&auml;hrungen."
      },
      {
        title: "Renten und Versicherungen",
        desc: "Schlie&szlig;en Sie Pensionsfonds und Lebensversicherungen in Ihr Verm&ouml;gen ein."
      },
      {
        title: "Gesamtverm&ouml;gen",
        desc: "Sehen Sie alles kombiniert: Aktien + ETFs + Krypto + Immobilien + Ersparnisse + Renten = Ihr vollst&auml;ndiges Bild."
      }
    ],
    tierText: "Bifolio: Bis zu 10 Verm&ouml;genswerte | Trefolio: Bis zu 999 Verm&ouml;genswerte",
    ctaLabel: "Manuelle Verm&ouml;genswerte hinzuf&uuml;gen"
  },
  "feature-crypto": {
    heading: "Krypto-Portfolio",
    intro: "Verfolgen Sie Krypto neben Ihren Aktien und ETFs. Erhalten Sie das gleiche Analyse- und Insight-Niveau f&uuml;r Ihre Krypto-Best&auml;nde.",
    sectionLabel: "Was Sie erhalten:",
    features: [
      {
        title: "Krypto-Dashboard",
        desc: "Preise, 24h-&Auml;nderungen, Volumen und Marktkapitalisierung der Top-Kryptow&auml;hrungen."
      },
      {
        title: "Portfolio-Tracking",
        desc: "F&uuml;gen Sie Krypto-Positionen neben Aktien hinzu. Sehen Sie den einheitlichen Portfoliowert und die Allokation."
      },
      {
        title: "Charts und Verlauf",
        desc: "Preisdiagramme mit mehreren Zeitrahmen und Wechselkurs-Overlays."
      },
      {
        title: "KI-Krypto-Analyse",
        desc: "Fragen Sie unsere KI zu jeder Krypto — Fundamentaldaten, Trends und Marktanalyse."
      }
    ],
    tierText: "Folio: Markt&uuml;bersicht | Trefolio: Vollst&auml;ndiges Portfolio-Tracking & KI",
    ctaLabel: "Krypto erkunden"
  }
};
