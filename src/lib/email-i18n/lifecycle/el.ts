import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings, TrialInvitationStrings, TrialExpiredStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Καλώς ήρθες στο trefolio!",
  paragraph: "Ο λογαριασμός σου είναι έτοιμος. Το trefolio είναι το επιπλέον φύλλο για το χαρτοφυλάκιό σου — όλα όσα χρειάζεσαι για να παρακολουθείς, να κατανοείς και να αναπτύσσεις τις επενδύσεις σου σε ένα μέρος.",
  features: [
    {
      title: "Τιμές σε πραγματικό χρόνο",
      desc: "Ζωντανές τιμές από το Yahoo Finance σε πάνω από 60 παγκόσμιες χρηματιστήρια. Δες την αξία του χαρτοφυλακίου σου να ενημερώνεται καθ' όλη τη διάρκεια της ημέρας."
    },
    {
      title: "Παρακολούθηση μερισμάτων",
      desc: "Αυτόματη ανίχνευση μερισμάτων, ετήσιες προβολές εισοδήματος, απόδοση σε κόστος και ημερήσιο ημερολόγιο πληρωμών."
    },
    {
      title: "Ανάλυση με AI",
      desc: "Ρώτα το AI μας για οποιαδήποτε μετοχή — λάβε ανάλυση αποτελεσμάτων, συγκρίσεις ανταγωνιστών και εκτιμήσεις κινδύνου. 5 δωρεάν κλήσεις/μήνα."
    },
    {
      title: "Εύκολη εισαγωγή",
      desc: "Φέρε το χαρτοφυλάκιό σου από πάνω από 20 brokers μέσω φόρτωσης CSV, Broker Sync με ένα κλικ ή εισαγωγή με υποστήριξη AI."
    },
    {
      title: "Ειδοποιήσεις τιμών",
      desc: "Ενημερώσου όταν οι μετοχές φτάσουν την τιμή στόχο σου. Ειδοποιήσεις email και push διαθέσιμες στο trefolio."
    },
    {
      title: "Προηγμένα μετρήσιμα",
      desc: "Λόγος Sharpe, μέγιστη κάθοδος, διακύμανση και πλήρες ιστορικό απόδοσης για μέτρηση της στρατηγικής σου."
    },
    {
      title: "Θεμελιώδη και ευφυΐα",
      desc: "Εταιρικά οικονομικά, συναλλαγές insider, θεσμικές κατοχές και συναίσθημα ειδήσεων — όλα σε μία όψη."
    },
    {
      title: "Φίλτρο μετοχών",
      desc: "Φίλτραρε πάνω από 600 μετοχές με 6 φίλτρα και 5 ενσωματωμένες στρατηγικές για ανακάλυψη νέων ευκαιριών."
    }
  ],
  ctaPrimary: "Πρόσθεσε την πρώτη σου μετοχή",
  ctaSecondary: "Εξερεύνησε το dashboard",
  tipText: "&#x1F4A1; <strong>Η έναρξη είναι εύκολη:</strong> Πρόσθεσε μόνο μία μετοχή για να δεις το dashboard σου να ζωντανεύει με δεδομένα πραγματικού χρόνου, γραφήματα και AI insights."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Έκανες εξαιρετική αρχή!",
  intro: "Πρόσθεσες τις πρώτες σου μετοχές — το dashboard του χαρτοφυλακίου παρακολουθεί τώρα τις επενδύσεις σου σε πραγματικό χρόνο. Να τι μπορεί να κάνει το trefolio για εσένα:",
  features: [
    {
      title: "Dashboard σε πραγματικό χρόνο",
      desc: "Αξία χαρτοφυλακίου, ημερήσιες αλλαγές, ανάλυση κατανομής και γραφήματα απόδοσης — όλα ενημερώνονται ζωντανά."
    },
    {
      title: "Προβολές μερισμάτων",
      desc: "Ετήσιες προβολές εισοδήματος, παρακολούθηση απόδοσης και ημερήσιο ημερολόγιο μερισμάτων για τις θέσεις σου."
    },
    {
      title: "Ανάλυση μετοχών με AI",
      desc: "Ρώτα το AI μας οτιδήποτε για τις μετοχές σου. Λάβε ανάλυση αποτελεσμάτων, εκτιμήσεις κινδύνου και ανταγωνιστικές προβολές."
    },
    {
      title: "Ειδοποιήσεις τιμών",
      desc: "Μην χάσεις καμία κίνηση τιμής. Ρύθμισε ειδοποιήσεις και ενημερώσου μέσω email ή push."
    },
    {
      title: "Μετρήσιμα απόδοσης",
      desc: "Λόγος Sharpe, μέγιστη κάθοδος, TTWROR και πλήρες ιστορικό ανάπτυξης χαρτοφυλακίου για οποιαδήποτε περίοδο."
    },
    {
      title: "Θεμελιώδη εταιρείας",
      desc: "Καταστάσεις αποτελεσμάτων, ισολογισμοί, ταμειακή ροή, εσωτερικές συναλλαγές και θεσμικές κατοχές."
    },
    {
      title: "Φίλτρο και προσομοιωτής μετοχών",
      desc: "Φίλτραρε πάνω από 600 μετοχές και δοκίμασε στρατηγικές χαρτοφυλακίου με τον προσομοιωτή what-if μας."
    }
  ],
  voucherTitle: "Αποκλειστική προσφορά",
  voucherDiscountDisplay: "75% Έκπτωση",
  voucherApply: "Χρησιμοποίησε τον κωδικό κατά την πληρωμή:",
  voucherValid: "μηνιαία ή ετήσια",
  ctaPrimary: "Αναβάθμισε τώρα — 75% έκπτωση",
  ctaSecondary: "Εξερεύνησε το dashboard",
  tipText: "&#x1F4A1; <strong>Η έναρξη είναι εύκολη:</strong> Πρόσθεσε μόνο μία μετοχή για να δεις το dashboard σου να ζωντανεύει με δεδομένα πραγματικού χρόνου, γραφήματα και AI insights."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Καλώς ήρθες στο trefolio!",
  paragraph: "Η αναβάθμισή σου είναι ενεργή. Να τι ξεκλείδωσες:",
  features: [
    {
      title: "Portfolio Sharing",
      desc: "Generate a public link to share your portfolio performance with anyone — friends, family, or your community."
    },
    {
      title: "CSV Export",
      desc: "Download your holdings and transactions as CSV files for your own analysis or tax records."
    },
    {
      title: "Email & Push Alerts",
      desc: "Set up to 10 price alerts. Get notified instantly by email or browser push when stocks hit your targets."
    },
    {
      title: "Advanced Metrics",
      desc: "Sharpe ratio, max drawdown, and volatility — the metrics serious investors rely on."
    },
    {
      title: "Full Growth History",
      desc: "See your complete portfolio performance over any time period with detailed charts."
    },
    {
      title: "Net Worth Tracking",
      desc: "Track real estate, savings accounts, pensions — up to 10 manual assets for a complete financial picture."
    },
    {
      title: "Broker Sync",
      desc: "Connect your brokerage for one-click auto-sync of holdings, cash, and transactions."
    },
    {
      title: "20 AI Calls/Month",
      desc: "4x more AI analysis calls to understand your holdings, compare stocks, and get portfolio reviews."
    },
    {
      title: "AI Support Agent",
      desc: "Get instant help from our AI-powered support chat — available 24/7."
    }
  ],
  ctaPrimary: "Ρύθμισε την πρώτη σου ειδοποίηση",
  ctaSecondary: "Μοιράσου το χαρτοφυλάκιό σου",
  upsellText: "<strong>Θέλεις ακόμα περισσότερα;</strong> Το trefolio ξεκλειδώνει θεμελιώδη στοιχεία εταιρειών, φίλτρο μετοχών, φορολογικές αναφορές, ειδοποιήσεις WhatsApp και απεριόριστες θέσεις. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Μάθε περισσότερα</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Καλώς ήρθες στο trefolio!",
  paragraph: "Έχεις πλέον πλήρη πρόσβαση σε κάθε λειτουργία που προσφέρει το trefolio. Να το πλήρες toolkit σου:",
  groups: [
    {
      label: "Data & Analysis",
      items: [
        "Alpha Vantage premium data",
        "Company fundamentals: income, balance sheet, cash flow",
        "Economic indicators dashboard"
      ]
    },
    {
      label: "Intelligence",
      items: [
        "News feed with sentiment analysis",
        "Insider trades & institutional holdings",
        "AI analysis: 30 calls/day, unlimited monthly"
      ]
    },
    {
      label: "Advanced Tools",
      items: [
        "Sharpe ratio, max drawdown, volatility metrics",
        "Full portfolio performance history",
        "Stock screener: 600+ stocks, 6 filters, 5 strategies"
      ]
    },
    {
      label: "Crypto Pro",
      items: [
        "Crypto charts, exchange rates, AI analysis",
        "Dedicated crypto portfolio tab"
      ]
    },
    {
      label: "Tax & Planning",
      items: [
        "EU tax reports (DE, FR, ES, NL, IT) with AI Tax Assistant",
        "Portfolio simulator: backtest, what-if, stress testing",
        "Financial planning: FIRE, retirement projections"
      ]
    },
    {
      label: "Alerts & Limits",
      items: [
        "WhatsApp & device notifications",
        "Unlimited price alerts & holdings",
        "Up to 5 portfolios",
        "999 manual assets for full net worth tracking"
      ]
    }
  ],
  ctaPrimary: "Εξερεύνησε τις αναλύσεις AI",
  ctaSecondary: "Δες τα θεμελιώδη",
  communityText: "&#x1F31F; <strong>Είσαι ένας από τους πρώτους 500 Pro μέλη.</strong> Σε ευχαριστούμε που πίστεψες στο trefolio. Το feedback σου καθορίζει τι θα φτιάξουμε στη συνέχεια."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "Η δοκιμ&#x3ae; Pro σας περιμ&#x3ad;νει",
  paragraph:
    "Γεια σου {{display_name}}, χτ&#x3af;ζεις το χαρτοφυλ&#x3ac;κι&#x3cc; σου στο trefolio &mdash; τ&#x3ce;ρα δοκ&#x3af;μασε ολ&#x3cc;κληρο το toolkit για 7 ημ&#x3ad;ρες, εντελ&#x3ce;ς δωρε&#x3ac;ν.",
  groups: [
    {
      label: "Δεδομ&#x3ad;να &amp; αν&#x3ac;λυση",
      items: [
        "Premium δεδομ&#x3ad;να Alpha Vantage",
        "Θεμελι&#x3ce;δη: αποτελ&#x3ad;σματα, ισολογισμ&#x3cc;ς, ταμειακ&#x3ae; ρο&#x3ae;",
        "Π&#x3af;νακας οικονομικ&#x3ce;ν δεικτ&#x3ce;ν",
      ],
    },
    {
      label: "Νοημοσ&#x3cd;νη",
      items: [
        "Ρο&#x3ae; ειδ&#x3ae;σεων με αν&#x3ac;λυση συναισθ&#x3ae;ματος",
        "Συναλλαγ&#x3ad;ς insider &amp; θεσμικ&#x3ad;ς κατοχ&#x3ad;ς",
        "Αν&#x3ac;λυση AI: 30 κλ&#x3ae;σεις/ημ&#x3ad;ρα, απερι&#x3cc;ριστες μηνια&#x3af;ως",
      ],
    },
    {
      label: "Προηγμ&#x3ad;να εργαλε&#x3af;α",
      items: [
        "Δε&#x3af;κτης Sharpe, μ&#x3ad;γιστη κ&#x3ac;θοδος, διακ&#x3cd;μανση",
        "Πλ&#x3ae;ρες ιστορικ&#x3cc; απ&#x3cc;δοσης χαρτοφυλακ&#x3af;ου",
        "Φ&#x3af;λτρο μετοχ&#x3ce;ν: 600+ μετοχ&#x3ad;ς, 6 φ&#x3af;λτρα",
      ],
    },
    {
      label: "Ειδοποι&#x3ae;σεις &amp; &#x3cc;ρια",
      items: [
        "Ειδοποι&#x3ae;σεις WhatsApp &amp; συσκευ&#x3ae;ς",
        "Απερι&#x3cc;ριστες ειδοποι&#x3ae;σεις τιμ&#x3ce;ν &amp; θ&#x3ad;σεις",
        "&#x388;ως 5 χαρτοφυλ&#x3ac;κια",
      ],
    },
  ],
  ctaPrimary: "Ενεργοπο&#x3af;ησε τη δωρε&#x3ac;ν δοκιμ&#x3ae; σου",
  ctaSecondary: "Δες τι περιλαμβ&#x3ac;νεται",
  disclaimer:
    "Δεν απαιτε&#x3af;ται πιστωτικ&#x3ae; κ&#x3ac;ρτα. Μετ&#x3ac; απ&#x3cc; 7 ημ&#x3ad;ρες, ο λογαριασμ&#x3cc;ς σου επιστρ&#x3ad;φει στο δωρε&#x3ac;ν πλ&#x3ac;νο &mdash; χωρ&#x3af;ς εκπλ&#x3ae;ξεις.",
  signoffIntro:
    "&#x388;φτιαξα το trefolio επειδ&#x3ae; &#x3ae;θελα &#x3ad;ναν καλ&#x3cd;τερο τρ&#x3cc;πο να παρακολουθ&#x3ce; το δικ&#x3cc; μου χαρτοφυλ&#x3ac;κιο. Ελπ&#x3af;ζω να απολα&#x3cd;σεις την πλ&#x3ae;ρη εμπειρ&#x3af;α.",
  signoffReply:
    "Πες μου τη γν&#x3ce;μη σου &mdash; απλ&#x3ac; απ&#x3ac;ντησε σε αυτ&#x3cc; το email.",
};

export const trialExpired: TrialExpiredStrings = {
  heading: "Η δοκιμ&#x3ae; Pro σας τελε&#x3af;ωσε",
  paragraph:
    "Γεια σου {{display_name}}, η 7&#x3ae;μερη δοκιμ&#x3ae; trefolio τελε&#x3af;ωσε. Να τι θα χ&#x3ac;σεις:",
  features: [
    {
      title: "Προηγμ&#x3ad;νη αναλυτικ&#x3ae;",
      desc: "Δε&#x3af;κτης Sharpe, μ&#x3ad;γιστη κ&#x3ac;θοδος, διακ&#x3cd;μανση και πλ&#x3ae;ρες ιστορικ&#x3cc; αν&#x3ac;πτυξης",
    },
    {
      title: "Αν&#x3ac;λυση AI",
      desc: "30 κλ&#x3ae;σεις/ημ&#x3ad;ρα με εμβαθυσμ&#x3ad;νες πληροφορ&#x3af;ες για μετοχ&#x3ad;ς και αξιολογ&#x3ae;σεις χαρτοφυλακ&#x3af;ου",
    },
    {
      title: "Θεμελι&#x3ce;δη εταιρε&#x3af;ας",
      desc: "Καταστ&#x3ac;σεις αποτελεσμ&#x3ac;των, ισολογισμο&#x3af;, συναλλαγ&#x3ad;ς insider και θεσμικ&#x3ad;ς κατοχ&#x3ad;ς",
    },
    {
      title: "Premium ειδοποι&#x3ae;σεις",
      desc: "Ειδοποι&#x3ae;σεις WhatsApp, απερι&#x3cc;ριστες ειδοποι&#x3ae;σεις και &#x3ad;ως 5 χαρτοφυλ&#x3ac;κια",
    },
  ],
  pricingNote: "Τα πλ&#x3ac;να ξεκινο&#x3cd;ν απ&#x3cc; &euro;4,99/μ&#x3ae;να. Ακ&#x3cd;ρωση αν&#x3ac; π&#x3ac;σα στιγμ&#x3ae;.",
  ctaPrimary: "Εγγραφ&#x3ae; στο trefolio",
  ctaSecondary: "Δες τιμολ&#x3cc;γηση",
  signoffIntro:
    "Ελπ&#x3af;ζω η δοκιμ&#x3ae; να σου &#x3ad;δωσε μια πραγματικ&#x3ae; γε&#x3cd;ση απ&#x3cc; το τι μπορε&#x3af; να κ&#x3ac;νει το trefolio. Αν &#x3ad;χεις feedback, θα &#x3ae;θελα πραγματικ&#x3ac; να το ακο&#x3cd;σω.",
  growthTitle:
    "&Tau;&omicron; &chi;&alpha;&rho;&tau;&omicron;&phi;&upsilon;&lambda;ά&kappa;&iota;ό &sigma;&alpha;&sigmaf; &alpha;&upsilon;&xi;ή&theta;&eta;&kappa;&epsilon; &kappa;&alpha;&tau;ά {{growth_pct}}% &kappa;&alpha;&tau;ά &tau;&eta; &delta;&omicron;&kappa;&iota;&mu;&alpha;&sigma;&tau;&iota;&kappa;ή &pi;&epsilon;&rho;ί&omicron;&delta;&omicron;",
  growthDesc:
    "&Mu;&epsilon; &tau;&omicron; Pro, &mu;&pi;&omicron;&rho;&epsilon;ί&tau;&epsilon; &nu;&alpha; &sigma;&upsilon;&nu;&epsilon;&chi;ί&sigma;&epsilon;&tau;&epsilon; &nu;&alpha; &pi;&alpha;&rho;&alpha;&kappa;&omicron;&lambda;&omicron;&upsilon;&theta;&epsilon;ί&tau;&epsilon; &lambda;&epsilon;&pi;&tau;&omicron;&mu;&epsilon;&rho;&epsilon;ί&sigmaf; &mu;&epsilon;&tau;&rho;ή&sigma;&epsilon;&iota;&sigmaf; &alpha;&pi;ό&delta;&omicron;&sigma;&eta;&sigmaf; &kappa;&alpha;&iota; &nu;&alpha; &lambda;&alpha;&mu;&beta;ά&nu;&epsilon;&tau;&epsilon; &alpha;&nu;&alpha;&lambda;ύ&sigma;&epsilon;&iota;&sigmaf; AI &gamma;&iota;&alpha; &tau;&alpha; &epsilon;&pi;ό&mu;&epsilon;&nu;&alpha; &beta;ή&mu;&alpha;&tau;ά &sigma;&alpha;&sigmaf;.",
  growthTitleDown: "&Omicron;&iota; &alpha;&gamma;&omicron;&rho;έ&sigmaf; ά&lambda;&lambda;&alpha;&xi;&alpha;&nu; &mdash; &tau;&omicron; &chi;&alpha;&rho;&tau;&omicron;&phi;&upsilon;&lambda;ά&kappa;&iota;ό &sigma;&alpha;&sigmaf; &kappa;&iota;&nu;ή&theta;&eta;&kappa;&epsilon; {{growth_pct}}% &kappa;&alpha;&tau;ά &tau;&eta; &delta;&omicron;&kappa;&iota;&mu;&alpha;&sigma;&tau;&iota;&kappa;ή &pi;&epsilon;&rho;ί&omicron;&delta;&omicron;",
  growthDescDown: "&Mu;&epsilon; &tau;&omicron; Pro, &theta;&alpha; &epsilon;ί&chi;&alpha;&tau;&epsilon; &epsilon;&iota;&delta;&omicron;&pi;&omicron;&iota;ή&sigma;&epsilon;&iota;&sigmaf; AI &kappa;&alpha;&iota; &beta;&alpha;&theta;ύ&tau;&epsilon;&rho;&epsilon;&sigmaf; &alpha;&nu;&alpha;&lambda;ύ&sigma;&epsilon;&iota;&sigmaf; &gamma;&iota;&alpha; &nu;&alpha; &alpha;&nu;&tau;&iota;&delta;&rho;ά&sigma;&epsilon;&tau;&epsilon; &gamma;&rho;&eta;&gamma;&omicron;&rho;ό&tau;&epsilon;&rho;&alpha; &sigma;&tau;&iota;&sigmaf; &kappa;&iota;&nu;ή&sigma;&epsilon;&iota;&sigmaf; &tau;&eta;&sigmaf; &alpha;&gamma;&omicron;&rho;ά&sigmaf;.",
};
