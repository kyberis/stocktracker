import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Tento e-mail jste obdrželi od trefolio.",
  unsubscribeLabel: "Odhl&aacute;sit se"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Kurzy v re&aacute;ln&eacute;m &ccaron;ase",
    intro: "Va&scaron;e portfolio dashboard aktualizuje ceny v re&aacute;ln&eacute;m &ccaron;ase po cel&yacute; obchodn&iacute; den — bez nutnosti ru&ccaron;n&iacute;ho obnoven&iacute;.",
    sectionLabel: "Co z&iacute;sk&aacute;te:",
    features: [
      {
        title: "60+ burz",
        desc: "Ceny z NYSE, NASDAQ, Euronext, Lond&yacute;n, Frankfurt a dal&scaron;&iacute; — powered by Yahoo Finance."
      },
      {
        title: "Automatick&eacute; obnoven&iacute;",
        desc: "Kurzy se obnovuj&iacute; ka&zdot;d&yacute;ch 15 sekund (konfigurovateln&eacute; na 30s nebo 60s v nastaven&iacute;)."
      },
      {
        title: "Multi-m&ecaron;na",
        desc: "Zobrazte hodnoty ve sv&eacute; lok&aacute;ln&iacute; m&ecaron;n&ecaron;. Podporujeme 21 m&ecaron;n s automatick&yacute;m p&rcaron;evodem."
      }
    ],
    tierText: "",
    ctaLabel: "Otevř&iacute;t dashboard"
  },
  "feature-dividend-tracking": {
    heading: "Sledov&aacute;n&iacute; dividend",
    intro: "trefolio automaticky detekuje dividendy z va&scaron;ich pozic a vytv&aacute;&rcaron;&iacute; kompletní p&rcaron;ehled p&rcaron;&iacute;jmů.",
    sectionLabel: "Co z&iacute;sk&aacute;te:",
    features: [
      {
        title: "Dividendov&yacute; kalend&aacute;&rcaron;",
        desc: "Prohl&eacute;dněte si nadch&aacute;zej&iacute;c&iacute; platby m&ecirc;s&iacute;c po m&ecirc;s&iacute;ci. V&iacute;te přesně, kdy dividendy doraz&iacute; na v&aacute;&scaron; &uacute;čet."
      },
      {
        title: "Ročn&iacute; p&rcaron;&iacute;jem",
        desc: "Celkov&yacute; předpokl&aacute;dan&yacute; dividendov&yacute; p&rcaron;&iacute;jem v cel&eacute;m portf&oacute;liu s rozpisem podle akci&iacute;."
      },
      {
        title: "V&yacute;nos na n&aacute;klady",
        desc: "Sledujte svůj skutečn&yacute; v&yacute;nos založen&yacute; na kupn&iacute; ceně — nejen aktu&aacute;ln&iacute; sazbu dividend."
      },
      {
        title: "Simulace DRIP",
        desc: "Pod&iacute;vejte se, jak reinvestice dividend mohla zhodnotit va&scaron;e výnosy za 5, 10 nebo 20 let."
      }
    ],
    tierText: "",
    ctaLabel: "Zobrazit dividendy"
  },
  "feature-ai-analysis": {
    heading: "Anal&yacute;za akci&iacute; pomoc&iacute; IA",
    intro: "Zeptejte se na&scaron;e IA na jakoukoli akcii ve va&scaron;em portf&oacute;liu nebo jak&yacute;koli ticker, kter&yacute; zva&zdot;ujete. Z&iacute;skejte anal&yacute;zu institucion&aacute;ln&iacute; kvality za sekundy.",
    sectionLabel: "Na co se m&uuml;&zcaron;ete zeptat:",
    features: [
      {
        title: "Anal&yacute;za v&yacute;sledků",
        desc: "\"Jak dopadly posledn&iacute; v&yacute;sledky AAPL?\" — shrnut&iacute; v&yacute;sledků, směrnice a reakce trhu."
      },
      {
        title: "Hodnocen&iacute; rizika",
        desc: "\"Jak&aacute; jsou rizika dr&zcaron;en&iacute; TSLA?\" — konkurenčn&iacute; hrozby, oceněn&iacute; a makro faktory."
      },
      {
        title: "Srovn&aacute;n&iacute; konkurentů",
        desc: "\"Porovnej MSFT vs GOOG\" — anal&yacute;za vedle sebe finančn&iacute;ch dat, růstu a oceněn&iacute;."
      },
      {
        title: "Přehled portf&oacute;lia",
        desc: "\"Projděte m&eacute; portf&oacute;lio\" — IA analyzuje alokaci, riziko a navrhuje zlep&scaron;en&iacute;."
      }
    ],
    tierText: "",
    ctaLabel: "Vyzkou&scaron;ejte anal&yacute;zu IA nyn&iacute;"
  },
  "feature-price-alerts": {
    heading: "Cenové alarmy",
    intro: "Nikdy si nenechte ujít důležitý cenový pohyb. Nastavte cílové ceny a buďte upozorněni, když akcie překročí váš práh.",
    sectionLabel: "Jak to funguje:",
    features: [
      {
        title: "Prahové alarmy",
        desc: "Nastavte cenové cíle \"nad\" nebo \"pod\". Buďte upozorněni, když akcie překročí vaši linii."
      },
      {
        title: "Alarmy změny %",
        desc: "Sledujte denní nebo od nákupu procentní změny. Zachyťte poklesy nebo růsty brzy."
      },
      {
        title: "Multi-kanál",
        desc: "E-mailové a push alarmy na trefolio. Přidejte WhatsApp a alarmy zařízení na trefolio."
      },
      {
        title: "Poháněno cronem",
        desc: "Náš systém kontroluje ceny každou minutu během obchodních hodin. Nikdy nemusíte sledovat obrazovku."
      }
    ],
    tierText: "",
    ctaLabel: "Vytvořit první alarm"
  },
  "feature-broker-import": {
    heading: "Import portf&oacute;lia",
    intro: "Přid&aacute;v&aacute;te akcie ručn&iacute; jednu po druhé? Existuje rychlej&scaron;&iacute; způsob. trefolio podporuje tři metody importu pro z&iacute;sk&aacute;n&iacute; cel&eacute;ho portf&oacute;lia za sekundy.",
    sectionLabel: "Vyberte svou metodu:",
    features: [
      {
        title: "Broker Sync",
        desc: "Připojte svého brokera a automaticky synchronizujeme va&scaron;e pozice, hotovost a transakce. Nastaven&iacute; jedním kliknut&iacute;m, vždy aktu&aacute;ln&iacute;."
      },
      {
        title: "Nahr&aacute;n&iacute; CSV",
        desc: "Exportujte CSV od brokera a nahrajte ho. Podporujeme 20+ form&aacute;tů včetně DEGIRO, Interactive Brokers, Trade Republic a dal&scaron;&iacute;ch."
      },
      {
        title: "AI Import",
        desc: "Nahrajte jak&yacute;koli soubor — CSV, PDF nebo screenshot — a na&scaron;e IA ho převede do portf&oacute;lia. Funguje i s neobvykl&yacute;mi form&aacute;ty."
      }
    ],
    tierText: "",
    ctaLabel: "Importovat portf&oacute;lio"
  },
  "feature-fundamentals": {
    heading: "Z&aacute;kladn&iacute; &uacute;daje firmy",
    intro: "Jděte za hranice cen akci&iacute;. trefolio vám d&aacute;v&aacute; p&rcaron;&iacute;stup k &uacute;pln&yacute;m firemn&iacute;m financ&iacute;m — stejn&yacute;m datům, kter&aacute; pou&zdot;&iacute;vaj&iacute; profesion&aacute;ln&iacute; analytici.",
    sectionLabel: "Co z&iacute;sk&aacute;te:",
    features: [
      {
        title: "V&yacute;kaz zisků a ztr&aacute;t",
        desc: "Tr&zdot;by, &ccaron;ist&yacute; zisk, mar&zdot;e a zisk na akcii — &ccaron;tvrtletn&iacute; a ro&ccaron;n&iacute;."
      },
      {
        title: "Rozvaha",
        desc: "Aktiva, pasiva, &uacute;rovně dluhů a &uacute;&ccaron;etn&iacute; hodnota na jeden pohled."
      },
      {
        title: "Tok peněz",
        desc: "Provozn&iacute;, investi&ccaron;n&iacute; a finan&ccaron;n&iacute; toky. Zjistěte, zda firma generuje skute&ccaron;nou hotovost."
      },
      {
        title: "Insider obchody",
        desc: "Pod&iacute;vejte se, co vedouc&iacute; pracovn&iacute;ci a &ccaron;lenov&eacute; představenstva nakupuj&iacute; a prod&aacute;vaj&iacute;."
      },
      {
        title: "Institu&ccaron;n&iacute; pod&iacute;ly",
        desc: "Sledujte, co vlastn&iacute; velk&eacute; fondy — Vanguard, BlackRock, Fidelity a dal&scaron;&iacute;."
      }
    ],
    tierText: "",
    ctaLabel: "Prozkoumat fundamenty"
  },
  "feature-stock-screener": {
    heading: "Filtr akci&iacute;",
    intro: "Objevte akcie, kter&eacute; odpov&iacute;daj&iacute; va&scaron;im investi&ccaron;n&iacute;m krit&eacute;ri&iacute;m. Filtrujte 600+ akci&iacute; napří&ccaron; &ccaron;ty&rcaron;mi rozměry a aplikujte ověřen&eacute; strategie.",
    sectionLabel: "Filtrovat podle:",
    features: [
      {
        title: "6 rozměrů filtru",
        desc: "Tr&zdot;n&iacute; kapitalizace, poměr P/E, dividendov&yacute; v&yacute;nos, sektor, země a burza. Kombinujte tolik, kolik chcete."
      },
      {
        title: "5 vestavěných strategi&iacute;",
        desc: "Investice do hodnoty, r&uacute;st dividend, momentum, kvalita a small-cap — přednastaven&iacute; jedním kliknut&iacute;m."
      },
      {
        title: "Bohat&aacute; data",
        desc: "Cena, změna %, tr&zdot;n&iacute; kapitalizace, P/E, dividendov&yacute; v&yacute;nos a sektor pro ka&zdot;d&yacute; v&yacute;sledek."
      },
      {
        title: "Rychl&eacute; přid&aacute;n&iacute;",
        desc: "Na&scaron;li jste n&eacute;co zaj&iacute;mav&eacute;ho? Přidejte to do portf&oacute;lia nebo watchlistu přímo z v&yacute;sledků."
      }
    ],
    tierText: "",
    ctaLabel: "Otevř&iacute;t filtr"
  },
  "feature-tax-reports": {
    heading: "Daňov&eacute; zpr&aacute;vy",
    intro: "Daňov&eacute; přizn&aacute;n&iacute; nemus&iacute; b&yacute;t bolestiv&eacute;. trefolio generuje zpr&aacute;vy specifick&eacute; pro zemi a obsahuje daňov&eacute;ho asistenta IA pro va&scaron;e dotazy.",
    sectionLabel: "Co z&iacute;sk&aacute;te:",
    features: [
      {
        title: "5 zem&iacute; EU",
        desc: "Zpr&aacute;vy specifick&eacute; pro zemi pro N&ecaron;mecko, Francii, &Scaron;pan&eacute;lsko, Nizozem&iacute; a It&aacute;lii."
      },
      {
        title: "Zisky a ztr&aacute;ty",
        desc: "Vypo&ccaron;&iacute;tan&eacute; kapit&aacute;lov&eacute; zisky, ztr&aacute;ty a doba dr&zdot;by pro ka&zdot;dou pozici."
      },
      {
        title: "P&rcaron;&iacute;jem z dividend",
        desc: "Hrub&eacute; dividendy, srážkov&aacute; daň a &ccaron;ist&yacute; p&rcaron;&iacute;jem podle země původu."
      },
      {
        title: "Daňov&yacute; asistent IA",
        desc: "Ptejte se jako \"Kolik srážkov&eacute; daně jsem zaplatil z americk&yacute;ch dividend?\" a z&iacute;skejte okam&zdot;it&eacute; odpovědi."
      }
    ],
    tierText: "",
    ctaLabel: "Generovat daňov&yacute; zpr&aacute;vu"
  },
  "feature-portfolio-simulator": {
    heading: "Simul&aacute;tor portf&oacute;lia",
    intro: "Otestujte své investi&ccaron;n&iacute; n&aacute;pady p&rcaron;ed vlo&zdot;en&iacute;m skute&ccaron;n&yacute;ch peněz. Simul&aacute;tor umo&zdot;&nacute;uje backtest, stresov&eacute; testy a zkoum&aacute;n&iacute; what-if sc&eacute;n&aacute;&rcaron;ů.",
    sectionLabel: "T&rcaron;i re&zdot;imy:",
    features: [
      {
        title: "Backtest",
        desc: "Pod&iacute;vejte se, jak by portf&oacute;lio historicky performovalo. Porovnejte se S&P 500, MSCI World nebo vlastn&iacute;m benchmarkem."
      },
      {
        title: "Stresov&eacute; testy",
        desc: "Co kdyby trh klesl o 30%? A co rostouc&iacute; sazby? Uvid&iacute;te, jak si portf&oacute;lio vede v r&uacute;zn&yacute;ch sc&eacute;n&aacute;&rcaron;&iacute;ch."
      },
      {
        title: "What-if anal&yacute;za",
        desc: "Přid&aacute;vejte nebo odeb&iacute;rejte pozice, měňte alokace a okam&zdot;itě uvid&iacute;te dopad na riziko a v&yacute;nos."
      }
    ],
    tierText: "",
    ctaLabel: "Otevř&iacute;t simul&aacute;tor"
  },
  "feature-net-worth": {
    heading: "Sledov&aacute;n&iacute; &ccaron;ist&eacute;ho jmění",
    intro: "Va&scaron;e investice jsou jen &ccaron;&aacute;st&iacute; va&scaron;ich financ&iacute;. Sledujte vše — nemovitosti, &uacute;spory, důchody a dal&scaron;&iacute; — na jednom m&iacute;stě.",
    sectionLabel: "Co m&uacute;&zdot;ete sledovat:",
    features: [
      {
        title: "Nemovitosti",
        desc: "Přid&aacute;vejte nemovitosti s aktu&aacute;ln&iacute; hodnotou. Aktualizujte při zm&eacute;ně tr&zdot;n&iacute;ch podm&iacute;nek."
      },
      {
        title: "Spořic&iacute; &uacute;čty",
        desc: "Sledujte hotovost v bank&aacute;ch v r&uacute;zn&yacute;ch m&ecaron;n&aacute;ch."
      },
      {
        title: "Důchody a poji&scaron;tění",
        desc: "Zahrňte penzijn&iacute; fondy a životn&iacute; poji&scaron;tění do svého &ccaron;ist&eacute;ho jmění."
      },
      {
        title: "Celkov&eacute; &ccaron;ist&eacute; jmění",
        desc: "Zobrazte vše kombinovaně: akcie + ETFs + krypto + nemovitosti + &uacute;spory + důchody = v&aacute;&scaron; kompletní obr&aacute;zek."
      }
    ],
    tierText: "",
    ctaLabel: "Přidat manu&aacute;ln&iacute; aktiva"
  },
  "feature-crypto": {
    heading: "Krypto portf&oacute;lio",
    intro: "Sledujte krypto vedle sv&yacute;ch akci&iacute; a ETF. Z&iacute;skejte stejnou &uacute;roveň anal&yacute;zy a poznatků pro va&scaron;e krypto pozice.",
    sectionLabel: "Co z&iacute;sk&aacute;te:",
    features: [
      {
        title: "Krypto dashboard",
        desc: "Ceny, 24h zm&eacute;ny, objem a tr&zdot;n&iacute; kapitalizace hlavn&iacute;ch kryptoměn."
      },
      {
        title: "Sledov&aacute;n&iacute; portf&oacute;lia",
        desc: "Přid&aacute;vejte krypto pozice vedle akci&iacute;. Zobrazte sjednocenou hodnotu a alokaci portf&oacute;lia."
      },
      {
        title: "Grafy a historie",
        desc: "Cenov&eacute; grafy s v&iacute;ce &ccaron;asov&yacute;mi r&aacute;mci a p&rcaron;ekryvy směnn&yacute;ch kurzů."
      },
      {
        title: "Krypto anal&yacute;za IA",
        desc: "Zeptejte se na&scaron;&iacute; IA na jakoukoli krypto — fundamenty, trendy a tr&zdot;n&iacute; anal&yacute;zu."
      }
    ],
    tierText: "",
    ctaLabel: "Prozkoumat krypto"
  }
};
