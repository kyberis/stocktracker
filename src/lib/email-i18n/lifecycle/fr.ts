import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

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
      desc: "Soyez notifi&eacute; quand les actions atteignent votre prix cible. Alertes email et push disponibles sur Bifolio."
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
  voucherValid: "Valable sur Bifolio et Trefolio &mdash; mensuel ou annuel",
  ctaPrimary: "Mettre &agrave; niveau maintenant &mdash; 75% de r&eacute;duction",
  ctaSecondary: "Continuer avec Folio",
  tipText: "&#x1F4A1; <strong>Votre plan Folio</strong> inclut jusqu&rsquo;&agrave; 15 positions, 1 portefeuille et 5 appels IA/mois. Passez &agrave; une version sup&eacute;rieure pour en d&eacute;bloquer plus."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Bienvenue sur Bifolio !",
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
  upsellText: "<strong>Envie d&rsquo;encore plus ?</strong> Trefolio d&eacute;bloque les fondamentaux d&rsquo;entreprises, le filtre d&rsquo;actions, les rapports fiscaux, les alertes WhatsApp et les positions illimit&eacute;es. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">En savoir plus</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Bienvenue sur Trefolio Pro !",
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
