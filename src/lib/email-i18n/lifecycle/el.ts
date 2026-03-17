import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

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
      desc: "Ενημερώσου όταν οι μετοχές φτάσουν την τιμή στόχο σου. Ειδοποιήσεις email και push διαθέσιμες στο Bifolio."
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
  voucherValid: "Έγκυρο για Bifolio και Trefolio — μηνιαία ή ετήσια",
  ctaPrimary: "Αναβάθμισε τώρα — 75% έκπτωση",
  ctaSecondary: "Συνέχισε με Folio",
  tipText: "&#x1F4A1; <strong>Το πλάνο Folio σου</strong> περιλαμβάνει έως 15 θέσεις, 1 χαρτοφυλάκιο και 5 κλήσεις AI/μήνα. Αναβάθμισε για περισσότερα."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Καλώς ήρθες στο Bifolio!",
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
  upsellText: "<strong>Θέλεις ακόμα περισσότερα;</strong> Το Trefolio ξεκλειδώνει θεμελιώδη στοιχεία εταιρειών, φίλτρο μετοχών, φορολογικές αναφορές, ειδοποιήσεις WhatsApp και απεριόριστες θέσεις. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Μάθε περισσότερα</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Καλώς ήρθες στο Trefolio Pro!",
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
