import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings, TrialInvitationStrings, TrialExpiredStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "Bienvenue sur trefolio !",
  paragraph: "Votre compte est pr&ecirc;t. trefolio est la feuille suppl&eacute;mentaire pour votre portefeuille &mdash; tout ce dont vous avez besoin pour suivre, comprendre et faire cro&icirc;tre vos investissements en un seul endroit.",
  features: [
    {
      title: "Cotations en temps r&eacute;el",
      desc: "Prix en direct de Yahoo Finance sur plus de 60 places boursi&egrave;res mondiales. Voyez la valeur de votre portefeuille se mettre &agrave; jour tout au long de la journ&eacute;e."
    },
    {
      title: "Suivi des dividendes",
      desc: "D&eacute;tection automatique des dividendes, projections de revenus annuels, rendement sur co&ucirc;t et calendrier des paiements mensuels."
    },
    {
      title: "Analyse par IA",
      desc: "Demandez &agrave; notre IA tout sur une action &mdash; analyses de r&eacute;sultats, comparaisons concurrentielles et &eacute;valuations des risques. 5 appels gratuits/mois."
    },
    {
      title: "Import facile",
      desc: "Importez votre portefeuille depuis plus de 20 courtiers via t&eacute;l&eacute;chargement CSV, Broker Sync en un clic ou import assist&eacute; par IA."
    },
    {
      title: "Alertes de prix",
      desc: "Soyez notifi&eacute; quand les actions atteignent votre prix cible. Alertes email et push disponibles."
    },
    {
      title: "M&eacute;triques avanc&eacute;es",
      desc: "Ratio de Sharpe, drawdown max, volatilit&eacute; et historique complet des performances pour mesurer votre strat&eacute;gie."
    },
    {
      title: "Fondamentaux &amp; intelligence",
      desc: "Donn&eacute;es financi&egrave;res des soci&eacute;t&eacute;s, transactions d&rsquo;initi&eacute;s, participations institutionnelles et sentiment des actualit&eacute;s &mdash; le tout en une vue."
    },
    {
      title: "Filtre d&rsquo;actions",
      desc: "Filtrez plus de 600 actions avec 6 crit&egrave;res et 5 strat&eacute;gies int&eacute;gr&eacute;es pour d&eacute;couvrir de nouvelles opportunit&eacute;s."
    }
  ],
  ctaPrimary: "Ajoutez votre premi&egrave;re action",
  ctaSecondary: "Explorer le tableau de bord",
  tipText: "&#x1F4A1; <strong>Commencer est facile :</strong> Ajoutez une seule action pour voir votre tableau de bord prendre vie avec des donn&eacute;es en temps r&eacute;el, des graphiques et des insights IA."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Vous avez bien d&eacute;marr&eacute; !",
  intro: "Vous avez ajout&eacute; vos premi&egrave;res actions &mdash; le tableau de bord de votre portefeuille suit d&eacute;sormais vos investissements en temps r&eacute;el. Voici ce que trefolio peut faire pour vous :",
  features: [
    {
      title: "Tableau de bord en temps r&eacute;el",
      desc: "Valeur du portefeuille, variations quotidiennes, r&eacute;partition de l&rsquo;allocation et graphiques de performance &mdash; tout se met &agrave; jour en direct."
    },
    {
      title: "Insights dividendes",
      desc: "Projections de revenus annuels, suivi du rendement et calendrier mensuel des dividendes pour vos positions."
    },
    {
      title: "Analyse d&rsquo;actions par IA",
      desc: "Demandez &agrave; notre IA tout sur vos actions. Obtenez des analyses de r&eacute;sultats, &eacute;valuations des risques et insights concurrentiels."
    },
    {
      title: "Alertes de prix",
      desc: "Ne manquez aucun mouvement. D&eacute;finissez des alertes et soyez notifi&eacute; par e-mail ou push."
    },
    {
      title: "M&eacute;triques de performance",
      desc: "Ratio de Sharpe, drawdown max, TTWROR et historique complet de croissance du portefeuille sur toute p&eacute;riode."
    },
    {
      title: "Fondamentaux des soci&eacute;t&eacute;s",
      desc: "Comptes de r&eacute;sultat, bilans, flux de tr&eacute;sorerie, transactions d&rsquo;initi&eacute;s et participations institutionnelles."
    },
    {
      title: "Filtre &amp; simulateur d&rsquo;actions",
      desc: "Filtrez plus de 600 actions et faites du backtest de strat&eacute;gies de portefeuille avec notre simulateur what-if."
    }
  ],
  voucherTitle: "Offre exclusive",
  voucherDiscountDisplay: "75% DE R&Eacute;DUCTION",
  voucherApply: "Utilisez le code au paiement :",
  voucherValid: "mensuel ou annuel",
  ctaPrimary: "Mettre &agrave; niveau maintenant &mdash; 75% de r&eacute;duction",
  ctaSecondary: "Explorer le tableau de bord",
  tipText: "&#x1F4A1; <strong>Commencer est facile :</strong> Ajoutez une seule action pour voir votre tableau de bord prendre vie avec des donn&eacute;es en temps r&eacute;el, des graphiques et des insights IA."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Bienvenue sur trefolio !",
  paragraph: "Votre mise &agrave; niveau est active. Voici tout ce que vous venez de d&eacute;bloquer :",
  features: [
    {
      title: "Partage de portefeuille",
      desc: "G&eacute;n&eacute;rez un lien public pour partager les performances de votre portefeuille avec qui vous voulez &mdash; amis, famille ou votre communaut&eacute;."
    },
    {
      title: "Export CSV",
      desc: "T&eacute;l&eacute;chargez vos positions et transactions en fichiers CSV pour votre propre analyse ou vos dossiers fiscaux."
    },
    {
      title: "Alertes e-mail &amp; push",
      desc: "Configurez jusqu&rsquo;&agrave; 10 alertes de prix. Soyez notifi&eacute; instantan&eacute;ment par e-mail ou push navigateur quand les actions atteignent vos objectifs."
    },
    {
      title: "M&eacute;triques avanc&eacute;es",
      desc: "Ratio de Sharpe, drawdown max et volatilit&eacute; &mdash; les m&eacute;triques sur lesquelles s&rsquo;appuient les investisseurs s&eacute;rieux."
    },
    {
      title: "Historique complet de croissance",
      desc: "Voyez les performances compl&egrave;tes de votre portefeuille sur toute p&eacute;riode avec des graphiques d&eacute;taill&eacute;s."
    },
    {
      title: "Suivi du patrimoine net",
      desc: "Suivez immobilier, comptes d&rsquo;&eacute;pargne, retraites &mdash; jusqu&rsquo;&agrave; 10 actifs manuels pour une image financi&egrave;re compl&egrave;te."
    },
    {
      title: "Broker Sync",
      desc: "Connectez votre courtier pour une synchronisation automatique en un clic des positions, tr&eacute;sorerie et transactions."
    },
    {
      title: "20 appels IA/mois",
      desc: "4x plus d&rsquo;appels d&rsquo;analyse IA pour comprendre vos positions, comparer les actions et obtenir des revues de portefeuille."
    },
    {
      title: "Agent de support IA",
      desc: "Obtenez une aide instantan&eacute;e via notre chat de support propuls&eacute; par IA &mdash; disponible 24h/24."
    }
  ],
  ctaPrimary: "Configurer votre premi&egrave;re alerte",
  ctaSecondary: "Partager votre portefeuille",
  upsellText: "<strong>Envie d&rsquo;encore plus ?</strong> trefolio d&eacute;bloque les fondamentaux d&rsquo;entreprises, le filtre d&rsquo;actions, les rapports fiscaux, les alertes WhatsApp et les positions illimit&eacute;es. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">En savoir plus</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Bienvenue sur trefolio !",
  paragraph: "Vous avez maintenant acc&egrave;s complet &agrave; toutes les fonctionnalit&eacute;s de trefolio. Voici votre bo&icirc;te &agrave; outils compl&egrave;te :",
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
  ctaPrimary: "Explorer les analyses IA",
  ctaSecondary: "Voir les fondamentaux",
  communityText: "&#x1F31F; <strong>Vous &ecirc;tes l&rsquo;un de nos 500 premiers membres Pro.</strong> Merci de croire en trefolio. Vos retours façonnent ce que nous construisons ensuite."
};

export const trialInvitation: TrialInvitationStrings = {
  heading: "Votre essai Pro vous attend",
  paragraph: "Bonjour {{display_name}}, vous construisez votre portefeuille sur trefolio &mdash; d&eacute;couvrez maintenant la bo&icirc;te &agrave; outils compl&egrave;te pendant 7 jours, enti&egrave;rement gratuite.",
  groups: [
    {
      label: "Donn&eacute;es &amp; analyse",
      items: [
        "Donn&eacute;es premium Alpha Vantage",
        "Fondamentaux : compte de r&eacute;sultat, bilan, flux de tr&eacute;sorerie",
        "Tableau de bord des indicateurs &eacute;conomiques"
      ]
    },
    {
      label: "Intelligence",
      items: [
        "Fil d&rsquo;actualit&eacute;s avec analyse de sentiment",
        "Transactions d&rsquo;initi&eacute;s &amp; participations institutionnelles",
        "Analyse IA : 30 appels/jour, illimit&eacute; par mois"
      ]
    },
    {
      label: "Outils avanc&eacute;s",
      items: [
        "Ratio de Sharpe, drawdown max, volatilit&eacute;",
        "Historique complet des performances du portefeuille",
        "Filtre d&rsquo;actions : plus de 600 titres, 6 filtres"
      ]
    },
    {
      label: "Alertes &amp; limites",
      items: [
        "Notifications WhatsApp &amp; appareil",
        "Alertes de prix &amp; positions illimit&eacute;es",
        "Jusqu&rsquo;&agrave; 5 portefeuilles"
      ]
    }
  ],
  ctaPrimary: "Activer votre essai gratuit",
  ctaSecondary: "Voir ce qui est inclus",
  disclaimer: "Aucune carte bancaire requise. Apr&egrave;s 7 jours, votre compte repasse au plan Gratuit &mdash; sans surprise.",
  signoffIntro: "J&rsquo;ai cr&eacute;&eacute; trefolio parce que je voulais suivre mon propre portefeuille autrement. J&rsquo;esp&egrave;re que vous appr&eacute;cierez l&rsquo;exp&eacute;rience compl&egrave;te.",
  signoffReply: "Dites-moi ce que vous en pensez &mdash; il suffit de r&eacute;pondre &agrave; cet e-mail."
};

export const trialExpired: TrialExpiredStrings = {
  heading: "Votre essai Pro est termin&eacute;",
  paragraph: "Bonjour {{display_name}}, votre essai trefolio de 7 jours est termin&eacute;. Voici ce que vous allez manquer :",
  features: [
    {
      title: "Analyses avanc&eacute;es",
      desc: "Ratio de Sharpe, drawdown max, volatilit&eacute; et historique complet de croissance"
    },
    {
      title: "Analyse IA",
      desc: "30 appels/jour avec des analyses approfondies d&rsquo;actions et des revues de portefeuille"
    },
    {
      title: "Fondamentaux d&rsquo;entreprise",
      desc: "Comptes de r&eacute;sultat, bilans, transactions d&rsquo;initi&eacute;s et participations institutionnelles"
    },
    {
      title: "Alertes premium",
      desc: "Notifications WhatsApp, alertes illimit&eacute;es et jusqu&rsquo;&agrave; 5 portefeuilles"
    }
  ],
  pricingNote: "Les formules &agrave; partir de &euro;4,99/mois. R&eacute;siliation &agrave; tout moment.",
  ctaPrimary: "Souscrire &agrave; trefolio",
  ctaSecondary: "Voir les tarifs",
  signoffIntro: "J&rsquo;esp&egrave;re que l&rsquo;essai vous a donn&eacute; un vrai aper&ccedil;u de ce que trefolio peut faire. Si vous avez des retours, je serais ravi de les lire.",
  growthTitle: "Votre portefeuille a progress&eacute; de {{growth_pct}}% pendant l&rsquo;essai",
  growthDesc: "Avec Pro, vous pourriez continuer &agrave; suivre des m&eacute;triques de performance d&eacute;taill&eacute;es et obtenir des analyses IA sur vos prochains mouvements.",
  growthTitleDown: "Les march&eacute;s ont boug&eacute; &mdash; votre portefeuille a vari&eacute; de {{growth_pct}}% pendant l&rsquo;essai",
  growthDescDown: "Avec Pro, vous auriez des alertes IA et des analyses approfondies pour r&eacute;agir plus vite aux mouvements du march&eacute;.",
};
