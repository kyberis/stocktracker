import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Vous avez re&ccedil;u cet e-mail de trefolio.",
  unsubscribeLabel: "Se d&eacute;sabonner"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Cotations en temps r&eacute;el",
    intro: "Votre tableau de bord met &agrave; jour les prix en direct tout au long de la journ&eacute;e de n&eacute;gociation — pas besoin de rafra&icirc;chir manuellement.",
    sectionLabel: "Ce que vous obtenez :",
    features: [
      {
        title: "60+ places boursi&egrave;res",
        desc: "Prix de NYSE, NASDAQ, Euronext, Londres, Francfort et plus — aliment&eacute; par Yahoo Finance."
      },
      {
        title: "Actualisation auto",
        desc: "Les cotations se rafra&icirc;chissent toutes les 15 secondes (configurable &agrave; 30s ou 60s dans vos param&egrave;tres)."
      },
      {
        title: "Multi-devises",
        desc: "Voyez les valeurs dans votre devise locale. Nous prenons en charge 21 devises avec conversion automatique."
      }
    ],
    tierText: "Disponible sur tous les plans",
    ctaLabel: "Ouvrir votre tableau de bord"
  },
  "feature-dividend-tracking": {
    heading: "Suivi des dividendes",
    intro: "trefolio d&eacute;tecte automatiquement les dividendes de vos positions et construit une image compl&egrave;te de vos revenus.",
    sectionLabel: "Ce que vous obtenez :",
    features: [
      {
        title: "Calendrier des dividendes",
        desc: "Voyez les paiements &agrave; venir mois par mois. Sachez exactement quand les dividendes arrivent sur votre compte."
      },
      {
        title: "Revenus annuels",
        desc: "Revenus totaux projet&eacute;s de dividendes sur l'ensemble de votre portefeuille avec ventilation par action."
      },
      {
        title: "Rendement sur co&ucirc;t",
        desc: "Suivez votre rendement r&eacute;el bas&eacute; sur le prix d'achat — pas seulement le taux de dividende actuel."
      },
      {
        title: "Simulation DRIP",
        desc: "Voyez comment r&eacute;investir les dividendes pourrait faire fructifier vos rendements sur 5, 10 ou 20 ans."
      }
    ],
    tierText: "Disponible sur tous les plans",
    ctaLabel: "Voir vos dividendes"
  },
  "feature-ai-analysis": {
    heading: "Analyse d'actions par IA",
    intro: "Demandez &agrave; notre IA tout ce que vous voulez sur une action de votre portefeuille ou un ticker que vous envisagez. Obtenez une analyse de qualit&eacute; institutionnelle en secondes.",
    sectionLabel: "Ce que vous pouvez demander :",
    features: [
      {
        title: "Analyse des r&eacute;sultats",
        desc: "\"Comment &eacute;taient les derniers r&eacute;sultats d'AAPL ?\" — r&eacute;sum&eacute; des r&eacute;sultats, orientations et r&eacute;action du march&eacute;."
      },
      {
        title: "&Eacute;valuation des risques",
        desc: "\"Quels sont les risques de d&eacute;tenir TSLA ?\" — menaces concurrentielles, valorisation et facteurs macro."
      },
      {
        title: "Comparaison concurrentielle",
        desc: "\"Comparez MSFT vs GOOG\" — analyse c&ocirc;te &agrave; c&ocirc;te des finances, croissance et valorisation."
      },
      {
        title: "Revue de portefeuille",
        desc: "\"R&eacute;visez mon portefeuille\" — l'IA analyse votre allocation, risque et sugg&egrave;re des am&eacute;liorations."
      }
    ],
    tierText: "Folio : 5 appels/mois | Bifolio : 20/mois | Trefolio : Illimit&eacute;",
    ctaLabel: "Essayer l'analyse IA maintenant"
  },
  "feature-price-alerts": {
    heading: "Alertes de prix",
    intro: "Ne manquez jamais un mouvement de prix important. Définissez des prix cibles et soyez notifié dès qu'une action franchit votre seuil.",
    sectionLabel: "Comment ça marche :",
    features: [
      {
        title: "Alertes de seuil",
        desc: "Définissez des objectifs \"au-dessus\" ou \"en-dessous\". Soyez notifié quand une action franchit votre ligne."
      },
      {
        title: "Alertes de variation %",
        desc: "Suivez les variations quotidiennes ou depuis l'achat. Détectez les chutes ou hausses tôt."
      },
      {
        title: "Multi-canal",
        desc: "Alertes email et push sur Bifolio. Ajoutez WhatsApp et alertes appareil sur Trefolio."
      },
      {
        title: "Alimenté par cron",
        desc: "Notre système vérifie les prix chaque minute en heures de marché. Plus besoin de surveiller l'écran."
      }
    ],
    tierText: "Bifolio : Jusqu'à 10 alertes | Trefolio : Alertes illimitées",
    ctaLabel: "Créer votre première alerte"
  },
  "feature-broker-import": {
    heading: "Import de portefeuille",
    intro: "Vous ajoutez des actions manuellement une par une ? Il y a plus rapide. trefolio prend en charge trois m&eacute;thodes d'import pour obtenir votre portefeuille complet en secondes.",
    sectionLabel: "Choisissez votre m&eacute;thode :",
    features: [
      {
        title: "Sync Broker",
        desc: "Connectez votre courtier et nous synchronisons automatiquement vos positions, tr&eacute;sorerie et transactions. Configuration en un clic, toujours &agrave; jour."
      },
      {
        title: "T&eacute;l&eacute;chargement CSV",
        desc: "Exportez un CSV de votre courtier et t&eacute;l&eacute;chargez-le. Nous prenons en charge 20+ formats dont DEGIRO, Interactive Brokers, Trade Republic et plus."
      },
      {
        title: "Import IA",
        desc: "T&eacute;l&eacute;chargez n'importe quel fichier — CSV, PDF ou capture — et notre IA le transformera en portefeuille. Fonctionne m&ecirc;me avec des formats inhabituels."
      }
    ],
    tierText: "Folio : CSV &amp; Manuel | Bifolio : + Broker Sync | Trefolio : + AI Import",
    ctaLabel: "Importer votre portefeuille"
  },
  "feature-fundamentals": {
    heading: "Fundamentaux d'entreprise",
    intro: "Allez au-del&agrave; des cours. trefolio vous donne acc&egrave;s aux donn&eacute;es financi&egrave;res compl&egrave;tes — les m&ecirc;mes que les analystes professionnels.",
    sectionLabel: "Ce que vous obtenez :",
    features: [
      {
        title: "Compte de r&eacute;sultat",
        desc: "Chiffre d'affaires, r&eacute;sultat net, marges et b&eacute;n&eacute;fice par action — trimestriel et annuel."
      },
      {
        title: "Bilan",
        desc: "Actifs, passifs, niveaux d'endettement et valeur comptable en un coup d'&oelig;il."
      },
      {
        title: "Flux de tr&eacute;sorerie",
        desc: "Flux op&eacute;rationnels, d'investissement et de financement. Voyez si l'entreprise g&eacute;n&egrave;re du cash r&eacute;el."
      },
      {
        title: "Transactions d'initi&eacute;s",
        desc: "Voyez ce que les dirigeants et administrateurs ach&egrave;tent et vendent."
      },
      {
        title: "Participations institutionnelles",
        desc: "Suivez ce que poss&egrave;dent les grands fonds — Vanguard, BlackRock, Fidelity et plus."
      }
    ],
    tierText: "Exclusif Trefolio Pro",
    ctaLabel: "Explorer les fondamentaux"
  },
  "feature-stock-screener": {
    heading: "Filtre d'actions",
    intro: "D&eacute;couvrez des actions qui correspondent &agrave; vos crit&egrave;res d'investissement. Filtrez 600+ actions sur plusieurs dimensions et appliquez des strat&eacute;gies &eacute;prouv&eacute;es.",
    sectionLabel: "Filtrer par :",
    features: [
      {
        title: "6 dimensions de filtre",
        desc: "Capitalisation, ratio P/E, rendement des dividendes, secteur, pays et bourse. Combinez autant que vous voulez."
      },
      {
        title: "5 strat&eacute;gies int&eacute;gr&eacute;es",
        desc: "Investissement valeur, croissance des dividendes, momentum, qualit&eacute; et petites capitalisations — pr&eacute;r&eacute;glages en un clic."
      },
      {
        title: "Donn&eacute;es riches",
        desc: "Prix, variation %, capitalisation, P/E, rendement des dividendes et secteur pour chaque r&eacute;sultat."
      },
      {
        title: "Ajout rapide",
        desc: "Trouv&eacute; quelque chose d'int&eacute;ressant ? Ajoutez-le &agrave; votre portefeuille ou liste de suivi directement depuis les r&eacute;sultats."
      }
    ],
    tierText: "Exclusif Trefolio Pro",
    ctaLabel: "Ouvrir le filtre"
  },
  "feature-moat-screener": {
    heading: "Filtre Moat",
    intro: "Parcourez des centaines d'actions qui ont d&eacute;j&agrave; une &eacute;valuation de type moat &mdash; huit crit&egrave;res inspir&eacute;s de la fa&ccedil;on dont les investisseurs r&eacute;fl&eacute;chissent aux entreprises durables.",
    sectionLabel: "Ce que vous obtenez :",
    features: [
      {
        title: "Plus de 680 noms pr&eacute;-&eacute;valu&eacute;s",
        desc: "Un univers partag&eacute; de scores, mis &agrave; jour en continu pour ne pas repartir de z&eacute;ro."
      },
      {
        title: "Huit crit&egrave;res en un coup d'&oelig;il",
        desc: "Chaque action affiche r&eacute;ussi, avertissement ou &eacute;chec sur toute la liste &mdash; qualit&eacute; des r&eacute;sultats, marges, ROE, dette et plus."
      },
      {
        title: "Filtrez selon votre approche",
        desc: "Score minimum, secteur et ratio P/E &mdash; combinez les filtres pour faire remonter les id&eacute;es qui vous conviennent."
      },
      {
        title: "O&ugrave; l'ouvrir",
        desc: "Allez dans <strong>Outils &rarr; &Eacute;valuation d'actions</strong>, puis l'onglet <strong>Filtre Moat</strong>."
      }
    ],
    tierText: "Exclusif Trefolio Pro",
    ctaLabel: "Ouvrir l'&eacute;valuation d'actions"
  },
  "feature-tax-reports": {
    heading: "Rapports fiscaux",
    intro: "Les d&eacute;clarations fiscales n'ont pas besoin d'&ecirc;tre p&eacute;nibles. trefolio g&eacute;n&egrave;re des rapports fiscaux par pays et inclut un Assistant Fiscal IA pour vos questions.",
    sectionLabel: "Ce que vous obtenez :",
    features: [
      {
        title: "5 pays UE",
        desc: "Rapports sp&eacute;cifiques par pays pour l'Allemagne, la France, l'Espagne, les Pays-Bas et l'Italie."
      },
      {
        title: "Gains et pertes",
        desc: "Plus-values, moins-values et p&eacute;riode de d&eacute;tention calcul&eacute;es pour chaque position."
      },
      {
        title: "Revenus de dividendes",
        desc: "Dividendes bruts, retenue &agrave; la source et revenus nets par pays d'origine."
      },
      {
        title: "Assistant Fiscal IA",
        desc: "Posez des questions comme \"Combien ai-je pay&eacute; de retenue sur les dividendes am&eacute;ricains ?\" et obtenez des r&eacute;ponses instantan&eacute;es."
      }
    ],
    tierText: "Exclusif Trefolio Pro",
    ctaLabel: "G&eacute;n&eacute;rer votre rapport fiscal"
  },
  "feature-portfolio-simulator": {
    heading: "Simulateur de portefeuille",
    intro: "Testez vos id&eacute;es d'investissement avant d'engager de l'argent r&eacute;el. Le simulateur vous permet de faire du backtest, des tests de stress et d'explorer des sc&eacute;narios what-if.",
    sectionLabel: "Trois modes :",
    features: [
      {
        title: "Backtest",
        desc: "Voyez comment un portefeuille aurait perform&eacute; historiquement. Comparez avec S&P 500, MSCI World ou un benchmark personnalis&eacute;."
      },
      {
        title: "Tests de stress",
        desc: "Et si le march&eacute; chutait de 30 % ? Et si les taux montaient ? Voyez comment votre portefeuille r&eacute;siste &agrave; diff&eacute;rents sc&eacute;narios."
      },
      {
        title: "Analyse what-if",
        desc: "Ajoutez ou retirez des positions, modifiez les allocations et voyez instantan&eacute;ment l'impact sur le risque et le rendement."
      }
    ],
    tierText: "Exclusif Trefolio Pro",
    ctaLabel: "Ouvrir le simulateur"
  },
  "feature-net-worth": {
    heading: "Suivi de la valeur nette",
    intro: "Vos investissements ne sont qu'une partie de vos finances. Suivez tout — immobilier, &eacute;pargne, retraites et plus — en un seul endroit.",
    sectionLabel: "Ce que vous pouvez suivre :",
    features: [
      {
        title: "Immobilier",
        desc: "Ajoutez des propri&eacute;t&eacute;s avec la valeur actuelle. Mettez &agrave; jour quand les conditions du march&eacute; changent."
      },
      {
        title: "Comptes d'&eacute;pargne",
        desc: "Suivez les liquidit&eacute;s dans les banques en diff&eacute;rentes devises."
      },
      {
        title: "Retraites et assurances",
        desc: "Incluez les fonds de retraite et les polices d'assurance-vie dans votre valeur nette."
      },
      {
        title: "Valeur nette totale",
        desc: "Voyez tout combin&eacute; : actions + ETFs + crypto + immobilier + &eacute;pargne + retraites = votre image compl&egrave;te."
      }
    ],
    tierText: "Bifolio : Jusqu'&agrave; 10 actifs | Trefolio : Jusqu'&agrave; 999 actifs",
    ctaLabel: "Ajouter des actifs manuels"
  },
  "feature-crypto": {
    heading: "Portefeuille crypto",
    intro: "Suivez la crypto aux c&ocirc;t&eacute;s de vos actions et ETFs. B&eacute;n&eacute;ficiez du m&ecirc;me niveau d'analyse et d'insights pour vos avoirs crypto.",
    sectionLabel: "Ce que vous obtenez :",
    features: [
      {
        title: "Tableau de bord crypto",
        desc: "Prix, variations 24h, volume et capitalisation boursi&egrave;re des principales cryptomonnaies."
      },
      {
        title: "Suivi de portefeuille",
        desc: "Ajoutez des positions crypto aux c&ocirc;t&eacute;s des actions. Voyez la valeur et l'allocation unifi&eacute;es du portefeuille."
      },
      {
        title: "Graphiques et historique",
        desc: "Graphiques de prix avec plusieurs p&eacute;riodes et superpositions de taux de change."
      },
      {
        title: "Analyse crypto IA",
        desc: "Posez des questions &agrave; notre IA sur toute crypto — fondamentaux, tendances et analyse de march&eacute;."
      }
    ],
    tierText: "Folio : Aper&ccedil;u march&eacute; | Trefolio : Suivi complet et IA",
    ctaLabel: "Explorer la crypto"
  }
};
