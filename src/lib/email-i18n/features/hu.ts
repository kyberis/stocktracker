import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Ezt az e-mailt a trefoliot&oacute;l kapta.",
  unsubscribeLabel: "Leiratkoz&aacute;s"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Val&oacute;s idejű &aacute;rfolyamok",
    intro: "A portf&oacute;li&oacute; irány&iacute;t&oacute;pult val&oacute;s idejűben friss&iacute;ti az &aacute;rakat a keresked&eacute;si nap sor&aacute;n — nincs sz&uuml;ks&eacute;g manu&aacute;lis friss&iacute;t&eacute;sre.",
    sectionLabel: "Amit kap:",
    features: [
      {
        title: "60+ tőzsde",
        desc: "&Aacute;rak a NYSE, NASDAQ, Euronext, London, Frankfurt &eacute;s m&aacute;sokb&oacute;l — powered by Yahoo Finance."
      },
      {
        title: "Automatikus friss&iacute;t&eacute;s",
        desc: "Az &aacute;rfolyamok 15 m&aacute;sodpercenk&eacute;nt friss&uuml;lnek (be&aacute;ll&iacute;that&oacute; 30s vagy 60s-ra a be&aacute;ll&iacute;t&aacute;sokban)."
      },
      {
        title: "T&ouml;bb valut&aacute;s",
        desc: "L&aacute;ssa az &eacute;rt&eacute;keket helyi valut&aacute;ban. 21 valut&aacute;t t&aacute;mogatunk automatikus &aacute;tvalt&aacute;ssal."
      }
    ],
    tierText: "El&eacute;rhető minden csomagban",
    ctaLabel: "Irány&iacute;t&oacute;pult megnyit&aacute;sa"
  },
  "feature-dividend-tracking": {
    heading: "Dividend k&ouml;vet&eacute;s",
    intro: "trefolio automatikusan felismeri a dividendeket a poz&iacute;ci&oacute;idb&oacute;l &eacute;s teljes bev&eacute;teli k&eacute;pet alkot.",
    sectionLabel: "Amit kap:",
    features: [
      {
        title: "Dividend napt&aacute;r",
        desc: "L&aacute;ssa a k&ouml;vetkező fizet&eacute;seket h&oacute;naponk&eacute;nt. Tudja pontosan, mikor landolnak a dividendek a sz&aacute;ml&aacute;j&aacute;n."
      },
      {
        title: "&Eacute;ves bev&eacute;tel",
        desc: "Teljes becs&uuml;lt dividend bev&eacute;tel a teljes portf&oacute;li&oacute;ban r&eacute;szv&eacute;nyenk&eacute;nti bont&aacute;ssal."
      },
      {
        title: "Hozam a k&ouml;lts&eacute;gre",
        desc: "K&ouml;vesse a val&oacute;di hozam&aacute;t a v&aacute;s&aacute;rl&aacute;si &aacute;r alapj&aacute;n — nem csak a jelenlegi dividend r&aacute;t&aacute;t."
      },
      {
        title: "DRIP szimul&aacute;ci&oacute;",
        desc: "L&aacute;ssa, hogyan n&ouml;velheti a dividendek visszaforgat&aacute;sa a hozamait 5, 10 vagy 20 &eacute;v alatt."
      }
    ],
    tierText: "El&eacute;rhető minden csomagban",
    ctaLabel: "Dividendek megtekint&eacute;se"
  },
  "feature-ai-analysis": {
    heading: "IA r&eacute;szv&eacute;ny elemz&eacute;s",
    intro: "K&eacute;rd meg az IA-nkat b&aacute;rmely portf&oacute;li&oacute;dban l&eacute;vő r&eacute;szv&eacute;nyről vagy b&aacute;rmely fontolóra vett tickerről. Szervezeti minőségű elemz&eacute;st kap m&aacute;sodpercek alatt.",
    sectionLabel: "Mit k&eacute;rdezhetsz:",
    features: [
      {
        title: "Eredmény elemz&eacute;s",
        desc: "\"Hogyan voltak az AAPL utolsó eredményei?\" — &ouml;sszefoglal&oacute; az eredményekről, ir&aacute;nyelvekről &eacute;s piaci reakci&oacute;ról."
      },
      {
        title: "Kock&aacute;zat &eacute;rt&eacute;kel&eacute;s",
        desc: "\"Mik a TSLA tart&aacute;s&aacute;nak kock&aacute;zatai?\" — versenyt&aacute;rsak, &eacute;rt&eacute;kel&eacute;s &eacute;s makro t&eacute;nyezők."
      },
      {
        title: "Versenyző &ouml;sszehasonl&iacute;t&aacute;s",
        desc: "\"Hasonl&iacute;tsd össze MSFT vs GOOG\" — p&aacute;rhuzamos elemz&eacute;s a p&eacute;nz&uuml;gyekről, n&ouml;veked&eacute;sről &eacute;s &eacute;rt&eacute;kel&eacute;sről."
      },
      {
        title: "Portf&oacute;li&oacute; &aacute;ttekint&eacute;s",
        desc: "\"N&eacute;zd &aacute;t a portf&oacute;li&oacute;mat\" — az IA elemzi az allok&aacute;ci&oacute;t, kock&aacute;zatot &eacute;s javaslatokat tesz."
      }
    ],
    tierText: "Folio: 5 h&iacute;v&aacute;s/h&oacute; | Bifolio: 20/h&oacute; | Trefolio: Korl&aacute;tlan",
    ctaLabel: "Pr&oacute;b&aacute;ld ki az IA elemz&eacute;st most"
  },
  "feature-price-alerts": {
    heading: "Árriasztások",
    intro: "Soha ne hagyja ki a fontos ármozgást. Állítson be célárakat és kapjon értesítést, amikor egy részvény átlépi a küszöböt.",
    sectionLabel: "Hogyan működik:",
    features: [
      {
        title: "Küszöbriasztások",
        desc: "Állítson be \"felett\" vagy \"alatt\" árcélokat. Kapjon értesítést, ha bármely részvény átlépi a vonalát."
      },
      {
        title: "Százalékos változás riasztások",
        desc: "Kövesse a napi vagy vásárlás óta százalékos változásokat. Fogja el korán a zuhanásokat vagy emelkedéseket."
      },
      {
        title: "Többcsatornás",
        desc: "E-mail és push riasztások a Bifolióban. WhatsApp és eszközriasztások a Trefolióban."
      },
      {
        title: "Cron által hajtott",
        desc: "Rendszerünk percenként ellenőrzi az árakat a piaci órákban. Soha nem kell a képernyőt figyelnie."
      }
    ],
    tierText: "Bifolio: Akár 10 riasztás | Trefolio: Korlátlan riasztások",
    ctaLabel: "Első riasztás létrehozása"
  },
  "feature-broker-import": {
    heading: "Portf&oacute;li&oacute; import",
    intro: "Manu&aacute;lisan ad hozz&aacute; r&eacute;szv&eacute;nyeket egyenként? Van gyorsabb m&oacute;dszer. trefolio h&aacute;rom import m&oacute;dszert t&aacute;mogat a teljes portf&oacute;li&oacute; m&aacute;sodpercek alatti megszerz&eacute;s&eacute;hez.",
    sectionLabel: "V&aacute;lassza m&oacute;dszer&eacute;t:",
    features: [
      {
        title: "Broker Sync",
        desc: "Csatlakoztassa br&oacute;kert &eacute;s automatikusan szinkroniz&aacute;ljuk poz&iacute;ci&oacute;it, k&eacute;pz&eacute;st &eacute;s tranzakci&oacute;it. Egykattint&aacute;sos be&aacute;ll&iacute;t&aacute;s, mindig naprak&eacute;sz."
      },
      {
        title: "CSV felt&ouml;lt&eacute;s",
        desc: "Export&aacute;ljon CSV-t a br&oacute;kertől &eacute;s t&ouml;ltse fel. 20+ br&oacute;ker form&aacute;tumot t&aacute;mogatunk, bele&eacute;rtve a DEGIRO, Interactive Brokers, Trade Republic &eacute;s m&aacute;sokat."
      },
      {
        title: "AI Import",
        desc: "T&ouml;lts&ouml;n fel b&aacute;rmilyen f&aacute;jlt — CSV, PDF vagy screenshot — &eacute;s az IA portf&oacute;li&oacute;v&aacute; alak&iacute;tja. Műk&ouml;dik szokatlan form&aacute;tumokkal is."
      }
    ],
    tierText: "Folio: CSV &amp; K&eacute;zi | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Portf&oacute;li&oacute; import&aacute;l&aacute;sa"
  },
  "feature-fundamentals": {
    heading: "V&aacute;llalati alapadatok",
    intro: "Menj t&uacute;l az &aacute;rfolyamokon. A trefolio hozzáf&eacute;r&eacute;st ad a teljes v&aacute;llalati p&eacute;nz&uuml;gyekhez — ugyanazokhoz az adatokhoz, amelyeket a professzion&aacute;lis elemzők haszn&aacute;lnak.",
    sectionLabel: "Amit kap:",
    features: [
      {
        title: "Eredm&eacute;nykimutat&aacute;s",
        desc: "Bev&eacute;tel, nettó eredm&eacute;ny, m&aacute;rgar&eacute;s nyeres&eacute;g r&eacute;szv&eacute;nyenk&eacute;nt — negyed&eacute;ves &eacute;s &eacute;ves."
      },
      {
        title: "M&eacute;rleg",
        desc: "Eszk&ouml;z&ouml;k, k&ouml;telezetts&eacute;gek, ad&oacute;ss&aacute;gszintek &eacute;s k&ouml;nyv szerinti &eacute;rt&eacute;k egy pillant&aacute;sra."
      },
      {
        title: "P&eacute;nzforgalmi kimutat&aacute;s",
        desc: "Műk&ouml;d&eacute;si, befektet&eacute;si &eacute;s finansz&iacute;roz&aacute;si p&eacute;nzforgalmak. L&aacute;sd, hogy a v&aacute;llalat val&oacute;di k&eacute;pz&eacute;st gener&aacute;l-e."
      },
      {
        title: "Insider keresked&eacute;sek",
        desc: "L&aacute;sd, mit v&aacute;s&aacute;rolnak &eacute;s adnak el a vezetők &eacute;s igazgat&oacute;k."
      },
      {
        title: "Int&eacute;zm&eacute;nyi r&eacute;szv&eacute;nyek",
        desc: "K&ouml;vesse, mit birtokolnak a nagy alapok — Vanguard, BlackRock, Fidelity &eacute;s t&ouml;bb."
      }
    ],
    tierText: "Trefolio Pro exkluz&iacute;v",
    ctaLabel: "Fundamentumok felfedez&eacute;se"
  },
  "feature-stock-screener": {
    heading: "R&eacute;szv&eacute;ny szűrő",
    intro: "Fedezzen fel olyan r&eacute;szv&eacute;nyeket, amelyek megfelelnek befektet&eacute;si krit&eacute;riumainak. Szűrjön 600+ r&eacute;szv&eacute;nyt t&ouml;bb dimenzi&oacute;ban &eacute;s alkalmazzon bev&aacute;lt strat&eacute;gi&aacute;kat.",
    sectionLabel: "Szűr&eacute;s szerint:",
    features: [
      {
        title: "6 szűrő dimenzi&oacute;",
        desc: "Piaci &eacute;rt&eacute;k, P/E ar&aacute;ny, osztal&eacute;khozam, szektor, orsz&aacute;g &eacute;s tőzsde. Kombin&aacute;lja, amennyit csak akar."
      },
      {
        title: "5 be&eacute;p&iacute;tett strat&eacute;gia",
        desc: "&Eacute;rt&eacute;kbefektet&eacute;s, osztal&eacute;knöveked&eacute;s, momentum, minős&eacute;g &eacute;s kis tőke — egykattint&aacute;sos előbe&aacute;ll&iacute;t&aacute;sok."
      },
      {
        title: "Gazdag adatok",
        desc: "&Aacute;r, v&aacute;ltoz&aacute;s %, piaci &eacute;rt&eacute;k, P/E, osztal&eacute;khozam &eacute;s szektor minden eredm&eacute;nyhez."
      },
      {
        title: "Gyors hozz&aacute;ad&aacute;s",
        desc: "Tal&aacute;lt valami &eacute;rdekeset? Adja hozzá a portf&oacute;li&oacute;hoz vagy figyelőlist&aacute;hoz k&ouml;zvetlen&uuml;l az eredm&eacute;nyekből."
      }
    ],
    tierText: "Trefolio Pro exkluz&iacute;v",
    ctaLabel: "Szűrő megnyit&aacute;sa"
  },
  "feature-tax-reports": {
    heading: "Ad&oacute;jelent&eacute;sek",
    intro: "Az ad&oacute;bevall&aacute;s nem kell, hogy f&aacute;jdalmas legyen. A trefolio orsz&aacute;gspecifikus ad&oacute;jelent&eacute;seket k&eacute;szt&iacute;t &eacute;s tartalmaz egy IA Ad&oacute;asszisztenst a k&eacute;rd&eacute;seidhez.",
    sectionLabel: "Amit kap:",
    features: [
      {
        title: "5 EU orsz&aacute;g",
        desc: "Orsz&aacute;gspecifikus jelent&eacute;sek N&eacute;metorsz&aacute;g, Franciaorsz&aacute;g, Spanyolorsz&aacute;g, Hollandia &eacute;s Olaszorsz&aacute;g r&eacute;sz&eacute;re."
      },
      {
        title: "Nyeres&eacute;gek &eacute;s vesztes&eacute;gek",
        desc: "Sz&aacute;m&iacute;tott tőke nyeres&eacute;gek, vesztes&eacute;gek &eacute;s tart&aacute;si idő minden poz&iacute;ci&oacute;hoz."
      },
      {
        title: "Osztal&eacute;k bev&eacute;tel",
        desc: "Bruttó osztal&eacute;kok, forr&aacute;sad&oacute; &eacute;s nettó bev&eacute;tel eredet orsz&aacute;ga szerint."
      },
      {
        title: "IA Ad&oacute;asszisztens",
        desc: "Tegyen fel k&eacute;rd&eacute;seket, mint \"Mennyi forr&aacute;sad&oacute;t fizettem az amerikai osztal&eacute;kokon?\" &eacute;s kapjon azonnali v&aacute;laszokat."
      }
    ],
    tierText: "Trefolio Pro exkluz&iacute;v",
    ctaLabel: "Ad&oacute;jelent&eacute;s gener&aacute;l&aacute;sa"
  },
  "feature-portfolio-simulator": {
    heading: "Portf&oacute;li&oacute; szimul&aacute;tor",
    intro: "Tesztelje befektet&eacute;si &ouml;tleteit val&oacute;di p&eacute;nz el&eacute;g&eacute;se el&otilde;tt. A szimul&aacute;tor lehetőv&eacute; teszi a backtestet, stressztesztet &eacute;s what-if forgat&oacute;k&ouml;nyvek felfedez&eacute;s&eacute;t.",
    sectionLabel: "H&aacute;rom m&oacute;d:",
    features: [
      {
        title: "Backtest",
        desc: "L&aacute;ssa, hogyan teljes&iacute;tett volna egy portf&oacute;li&oacute; t&ouml;rt&eacute;nelmileg. Hasonl&iacute;tsa S&P 500, MSCI World vagy egyedi benchmarkkal."
      },
      {
        title: "Stresszteszt",
        desc: "Mi van, ha a piac 30%-ot esik? &Eacute;s ha emelkednek a kamatok? L&aacute;ssa, hogyan b&iacute;rja a portf&oacute;li&oacute;ja k&uuml;l&ouml;nb&ouml;ző forgat&oacute;k&ouml;nyveket."
      },
      {
        title: "What-if elemz&eacute;s",
        desc: "Adjon hozz&aacute; vagy vegyen el poz&iacute;ci&oacute;kat, v&aacute;ltoztassa az allok&aacute;ci&oacute;t &eacute;s azonnal l&aacute;ssa a kock&aacute;zat &eacute;s hozam hat&aacute;s&aacute;t."
      }
    ],
    tierText: "Trefolio Pro exkluz&iacute;v",
    ctaLabel: "Szimul&aacute;tor megnyit&aacute;sa"
  },
  "feature-net-worth": {
    heading: "Nett&oacute; vagyon k&ouml;vet&eacute;s",
    intro: "A befektet&eacute;seid csak egy r&eacute;sze a p&eacute;nz&uuml;gyeidnek. K&ouml;vesse mindent — ingatlanok, megtakar&iacute;t&aacute;sok, nyugd&iacute;jak &eacute;s t&ouml;bb — egy helyen.",
    sectionLabel: "Mit k&ouml;vethet:",
    features: [
      {
        title: "Ingatlanok",
        desc: "Adjon hozz&aacute; ingatlanokat jelenlegi &eacute;rt&eacute;kkel. Friss&iacute;tse, ha a piaci k&ouml;r&uuml;lm&eacute;nyek v&aacute;ltoznak."
      },
      {
        title: "Takar&eacute;kbet&eacute;ti sz&aacute;ml&aacute;k",
        desc: "K&ouml;vesse a k&eacute;pz&eacute;st bankokban k&uuml;l&ouml;nb&ouml;ző valut&aacute;kban."
      },
      {
        title: "Nyugd&iacute;jak &eacute;s biztos&iacute;t&aacute;sok",
        desc: "Foglalja bele a nyugd&iacute;jalapokat &eacute;s &eacute;letbiztos&iacute;t&aacute;si k&ouml;tv&eacute;nyeket a nett&oacute; vagyonodba."
      },
      {
        title: "Teljes nett&oacute; vagyon",
        desc: "L&aacute;ssa mindent kombin&aacute;lva: r&eacute;szv&eacute;nyek + ETFs + kripto + ingatlanok + megtakar&iacute;t&aacute;sok + nyugd&iacute;jak = teljes k&eacute;ped."
      }
    ],
    tierText: "Bifolio: Ak&aacute;r 10 eszk&ouml;z | Trefolio: Ak&aacute;r 999 eszk&ouml;z",
    ctaLabel: "Manu&aacute;lis eszk&ouml;z&ouml;k hozz&aacute;ad&aacute;sa"
  },
  "feature-crypto": {
    heading: "Kripto portf&oacute;li&oacute;",
    intro: "K&ouml;vesse a kriptot a r&eacute;szv&eacute;nyei &eacute;s ETF-jei mellett. Kapja meg ugyanazt az elemz&eacute;si &eacute;s insight szintet a kripto poz&iacute;ci&oacute;ihoz.",
    sectionLabel: "Amit kap:",
    features: [
      {
        title: "Kripto ir&aacute;ny&iacute;t&oacute;pult",
        desc: "&Aacute;rak, 24h v&aacute;ltoz&aacute;sok, volumen &eacute;s piaci &eacute;rt&eacute;k a legnagyobb kriptovalut&aacute;khoz."
      },
      {
        title: "Portf&oacute;li&oacute; k&ouml;vet&eacute;s",
        desc: "Adjon hozz&aacute; kripto poz&iacute;ci&oacute;kat a r&eacute;szv&eacute;nyek mellett. L&aacute;ssa az egys&eacute;ges portf&oacute;li&oacute; &eacute;rt&eacute;k&eacute;t &eacute;s allok&aacute;ci&oacute;j&aacute;t."
      },
      {
        title: "Grafikonok &eacute;s t&ouml;rt&eacute;net",
        desc: "&Aacute;rgrafikonok t&ouml;bb időkerettel &eacute;s &aacute;rfolyam r&eacute;tegekkel."
      },
      {
        title: "IA Kripto elemz&eacute;s",
        desc: "K&eacute;rdezze meg AI-nkat b&aacute;rmely kriptor&oacute;l — fundamentumok, trendek &eacute;s piaci elemz&eacute;s."
      }
    ],
    tierText: "Folio: Piaci &aacute;ttekint&eacute;s | Trefolio: Teljes portf&oacute;li&oacute; k&ouml;vet&eacute;s & IA",
    ctaLabel: "Kripto felfedez&eacute;se"
  }
};
