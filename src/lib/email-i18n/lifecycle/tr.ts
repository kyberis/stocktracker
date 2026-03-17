import type { WelcomeNoStocksStrings, WelcomeFreeStocksStrings, BifolioUpgradeStrings, TrefolioUpgradeStrings } from "../template-types";

export const welcomeNoStocks: WelcomeNoStocksStrings = {
  heading: "trefolio&#x27;ye Ho&#351;geldiniz!",
  paragraph: "Hesab&#305;n&#305;z haz&#305;r. trefolio portf&ouml;y&uuml;n&uuml;z i&ccedil;in ekstra yaprak &mdash; yat&#305;r&#305;mlar&#305;n&#305;z&#305; takip etmek, anlamak ve b&uuml;y&uuml;tmek i&ccedil;in ihtiyac&#305;n&#305;z olan her &#351;ey tek bir yerde.",
  features: [
    {
      title: "Ger&ccedil;ek Zamanl&#305; Kotasyonlar",
      desc: "Yahoo Finance&#x27;den d&uuml;nya genelinde 60&#x27;tan fazla borsada canl&#305; fiyatlar. Portf&ouml;y de&#287;erinizin g&uuml;n boyunca g&uuml;ncellenmesini izleyin."
    },
    {
      title: "Temett&uuml; Takibi",
      desc: "Otomatik temett&uuml; tespiti, y&#305;ll&#305;k gelir tahminleri, maliyet &uuml;zeri getiri ve ayl&#305;k &ouml;deme takvimi."
    },
    {
      title: "AI Destekli Analiz",
      desc: "Herhangi bir hisse hakk&#305;nda AI&#x27;m&#305;za sorun &mdash; kar analizi, rakip kar&#351;&#305;la&#351;t&#305;rmalar&#305; ve risk de&#287;erlendirmeleri al&#305;n. Ayda 5 &uuml;cretsiz &ccedil;a&#287;r&#305;."
    },
    {
      title: "Kolay &#304;thal Edin",
      desc: "Portf&ouml;y&uuml;n&uuml;z&uuml; 20&#x27;den fazla broker&#x27;dan CSV y&uuml;klemesi, tek t&#305;kla Broker Sync veya AI destekli import ile getirin."
    },
    {
      title: "Fiyat Uyar&#305;lar&#305;",
      desc: "Hisseler hedef fiyat&#305;n&#305;za ula&#351;t&#305;&#287;&#305;nda bildirim al&#305;n. Bifolio&#x27;da e-posta ve push uyar&#305;lar&#305; mevcut."
    },
    {
      title: "Geli&#351;mi&#351; Metrikler",
      desc: "Sharpe oran&#305;, maksimum d&uuml;&#351;&uuml;&#351;, volatilite ve stratejinizi &ouml;l&ccedil;mek i&ccedil;in tam performans ge&ccedil;mi&#351;i."
    },
    {
      title: "Fundamentaller &amp; &#304;stihbarat",
      desc: "&#350;irket finansallar&#305;, i&ccedil;eriden i&#351;lemler, kurumsal tutarlar ve haber sentimenti &mdash; hepsi tek bir g&ouml;r&uuml;n&uuml;mde."
    },
    {
      title: "Hisse S&uuml;zgeci",
      desc: "Yeni f&#305;rsatlar ke&#351;fetmek i&ccedil;in 6 filtre ve 5 yerle&#351;ik stratejiyle 600&#x27;den fazla hisseyi filtreleyin."
    }
  ],
  ctaPrimary: "&#304;lk Hissenizi Ekleyin",
  ctaSecondary: "Paneli Ke&#351;fedin",
  tipText: "&#x1F4A1; <strong>Ba&#351;lamak kolay:</strong> Dashboard&#x27;unuzun ger&ccedil;ek zamanl&#305; veriler, grafikler ve AI ile canlanmas&#305; i&ccedil;in sadece bir hisse ekleyin."
};

export const welcomeFreeStocks: WelcomeFreeStocksStrings = {
  heading: "Harika bir ba&#351;lang&#305;&#231; yapt&#305;n&#305;z!",
  intro: "&#304;lk hisselerinizi eklediniz &mdash; portf&ouml;y dashboard&#x27;unuz art&#305;k yat&#305;r&#305;mlar&#305;n&#305;z&#305; ger&ccedil;ek zamanl&#305; takip ediyor. trefolio sizin i&ccedil;in neler yapabilir:",
  features: [
    {
      title: "Ger&ccedil;ek zamanl&#305; dashboard",
      desc: "Portf&ouml;y de&#287;eri, g&uuml;nl&uuml;k de&#287;i&#351;imler, tahsis da&#287;&#305;l&#305;m&#305; ve performans grafikleri &mdash; hepsi canl&#305; g&uuml;ncelleniyor."
    },
    {
      title: "Temett&uuml; &ouml;ng&ouml;r&uuml;leri",
      desc: "Y&#305;ll&#305;k gelir tahminleri, getiri takibi ve tutarlar&#305;n&#305;z i&ccedil;in ayl&#305;k temett&uuml; takvimi."
    },
    {
      title: "AI hisse analizi",
      desc: "Hisseleriniz hakk&#305;nda AI&#x27;m&#305;za her &#351;eyi sorun. Kar analizi, risk de&#287;erlendirmeleri ve rekabet &ouml;ng&ouml;r&uuml;leri al&#305;n."
    },
    {
      title: "Fiyat uyar&#305;lar&#305;",
      desc: "Hi&ccedil;bir fiyat hareketini ka&ccedil;&#305;rmay&#305;n. Uyar&#305;lar&#305; ayarlay&#305;n ve e-posta veya push ile bildirim al&#305;n."
    },
    {
      title: "Performans metrikleri",
      desc: "Sharpe oran&#305;, maksimum d&uuml;&#351;&uuml;&#351;, TTWROR ve herhangi bir d&ouml;nem i&ccedil;in tam portf&ouml;y b&uuml;y&uuml;me ge&ccedil;mi&#351;i."
    },
    {
      title: "&#350;irket fundamentalleri",
      desc: "Gelir tablolar&#305;, bilan&ccedilo, nakit ak&#305;&#351;&#305;, i&ccedil;eriden i&#351;lemler ve kurumsal tutarlar."
    },
    {
      title: "Hisse s&uuml;zgeci ve sim&uuml;lat&ouml;r",
      desc: "600&#x27;den fazla hisseyi filtreleyin ve what-if sim&uuml;lat&ouml;r&uuml;m&uuml;zle portf&ouml;y stratejilerini test edin."
    }
  ],
  voucherTitle: "&Ouml;zel teklif",
  voucherDiscountDisplay: "%75 &#304;ND&#304;R&#304;M",
  voucherApply: "&Ouml;deme s&#305;ras&#305;nda kodu kullan&#305;n:",
  voucherValid: "Bifolio ve Trefolio i&ccedil;in ge&ccedil;erli &mdash; ayl&#305;k veya y&#305;ll&#305;k",
  ctaPrimary: "&#304;ndirime ge&ccedil;in &mdash; %75 indirim",
  ctaSecondary: "Folio ile devam edin",
  tipText: "&#x1F4A1; <strong>Folio plan&#305;n&#305;z</strong> 15 tutara kadar, 1 portf&ouml;y ve ayda 5 AI &ccedil;a&#287;r&#305;s&#305; i&ccedil;erir. Daha fazlas&#305; i&ccedil;in y&uuml;kseltin."
};

export const bifolioUpgrade: BifolioUpgradeStrings = {
  heading: "Bifolio&#x27;ya Ho&#351;geldiniz!",
  paragraph: "Y&uuml;kseltmeniz aktif. &#304;&#351;te az &ouml;nce a&ccedil;t&#305;&#287;&#305;n&#305;z her &#351;ey:",
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
  ctaPrimary: "&#304;lk Uyar&#305;n&#305;z&#305; Ayarlay&#305;n",
  ctaSecondary: "Portf&ouml;y&uuml;n&uuml;z&uuml; Payla&#351;&#305;n",
  upsellText: "<strong>Daha fazlas&#305; m&#305; istiyorsunuz?</strong> Trefolio &#351;irket fundamentallerini, hisse s&uuml;zgecini, vergi raporlar&#305;n&#305;, WhatsApp uyar&#305;lar&#305;n&#305; ve s&#305;n&#305;rs&#305;z tutarlar&#305; a&ccedil;ar. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Daha fazla bilgi</a>"
};

export const trefolioUpgrade: TrefolioUpgradeStrings = {
  heading: "Trefolio Pro&#x27;ya Ho&#351;geldiniz!",
  paragraph: "Art&#305;k trefolio&#x27;nin sundu&#287;u her &ouml;zelli&#287;e tam eri&#351;iminiz var. &#304;&#351;te tam ara&ccedil; setiniz:",
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
  ctaPrimary: "AI &#304;ncelemelerini Ke&#351;fedin",
  ctaSecondary: "Temel Verileri G&ouml;r&uuml;nt&uuml;le",
  communityText: "&#x1F31F; <strong>&#304;lk 500 Pro &uuml;yemizden birisiniz.</strong> trefolio&#x27;ye en ba&#351;tan inand&#305;&#287;&#305;n&#305;z i&ccedil;in te&#351;ekk&uuml;rler. Geri bildiriminiz bir sonraki &ouml;zellikleri &#351;ekillendiriyor."
};
