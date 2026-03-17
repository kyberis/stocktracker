import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Tento e-mail ste dostali od trefolio.",
  unsubscribeLabel: "Odhl&aacute;siť sa"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Kurzy v re&aacute;lnom &ccaron;ase",
    intro: "V&aacute;&scaron; portfolio dashboard aktualizuje ceny naživo počas obchodn&eacute;ho dňa — bez nutnosti ru&ccaron;n&eacute;ho obnovenia.",
    sectionLabel: "Čo z&iacute;skate:",
    features: [
      {
        title: "60+ búrz",
        desc: "Ceny z NYSE, NASDAQ, Euronext, Lond&yacute;n, Frankfurt a ďal&scaron;&iacute; — powered by Yahoo Finance."
      },
      {
        title: "Automatick&eacute; obnovenie",
        desc: "Kurzy sa obnovuj&uacute; ka&zdot;d&yacute;ch 15 sek&uacute;nd (konfigurovateľn&eacute; na 30s alebo 60s v nastaveniach)."
      },
      {
        title: "Multi-mena",
        desc: "Zobrazte hodnoty vo svojej lok&aacute;lnej mene. Podporujeme 21 mien s automatick&yacute;m prevodom."
      }
    ],
    tierText: "Dostupn&eacute; vo v&scaron;etk&yacute;ch pl&aacute;noch",
    ctaLabel: "Otvoriť dashboard"
  },
  "feature-dividend-tracking": {
    heading: "Sledovanie dividend",
    intro: "trefolio automaticky detekuje dividendy z va&scaron;ich poz&iacute;ci&iacute; a vytvor&iacute; kompletn&yacute; prehľad pr&iacute;jmov.",
    sectionLabel: "Čo z&iacute;skate:",
    features: [
      {
        title: "Dividendov&yacute; kalend&aacute;r",
        desc: "Prezrite si nadch&aacute;dzaj&uacute;ce platby mesiac po mesiaci. V&iacute;te presne, kedy dividendy dorazia na v&aacute;&scaron; &uacute;čet."
      },
      {
        title: "Ročn&yacute; pr&iacute;jem",
        desc: "Celkov&yacute; predpokladan&yacute; dividendov&yacute; pr&iacute;jem v celom portf&oacute;liu s rozpisom podľa akci&iacute;."
      },
      {
        title: "V&yacute;nos na n&aacute;klady",
        desc: "Sledujte svoj skutočn&yacute; v&yacute;nos založen&yacute; na k&uacute;pnej cene — nielen aktu&aacute;lnu sadzbu dividend."
      },
      {
        title: "Simul&aacute;cia DRIP",
        desc: "Pozrite sa, ako reinvest&iacute;cia dividend mohla zhodnotiť va&scaron;e v&yacute;nosy za 5, 10 alebo 20 rokov."
      }
    ],
    tierText: "Dostupn&eacute; vo v&scaron;etk&yacute;ch pl&aacute;noch",
    ctaLabel: "Zobraziť dividendy"
  },
  "feature-ai-analysis": {
    heading: "Anal&yacute;za akci&iacute; pomocou IA",
    intro: "Op&iacute;tajte sa na&scaron;ej IA na ak&uacute;koľvek akciu vo va&scaron;om portf&oacute;liu alebo ak&yacute;koľvek ticker, ktor&yacute; zva&zdot;ujete. Z&iacute;skajte anal&yacute;zu inštit&uacute;čnej kvality za sekundy.",
    sectionLabel: "Na &ccedil;o sa m&ocirc;&zcaron;ete op&iacute;tať:",
    features: [
      {
        title: "Anal&yacute;za v&yacute;sledkov",
        desc: "\"Ako dopadli posledn&eacute; v&yacute;sledky AAPL?\" — zhrnutie v&yacute;sledkov, smernice a reakcie trhu."
      },
      {
        title: "Hodnotenie rizika",
        desc: "\"Ak&eacute; s&uacute; rizik&aacute; dr&zcaron;ania TSLA?\" — konkurenčn&eacute; hrozby, ocenenie a makro faktory."
      },
      {
        title: "Porovnanie konkurentov",
        desc: "\"Porovnaj MSFT vs GOOG\" — anal&yacute;za vedľa seba finančn&yacute;ch &uacute;dajov, rastu a ocenenia."
      },
      {
        title: "Prehľad portf&oacute;lia",
        desc: "\"Prejdite moje portf&oacute;lio\" — IA analyzuje alok&aacute;ciu, riziko a navrhuje zlep&scaron;enia."
      }
    ],
    tierText: "Folio: 5 hovorov/mes. | Bifolio: 20/mes. | Trefolio: Neobmedzene",
    ctaLabel: "Vysk&uacute;&scaron;ajte anal&yacute;zu IA teraz"
  },
  "feature-price-alerts": {
    heading: "Cenové alarmy",
    intro: "Nikdy si nenechajte ujsť dôležitý cenový pohyb. Nastavte cieľové ceny a buďte upozornení, keď akcia prekročí váš prah.",
    sectionLabel: "Ako to funguje:",
    features: [
      {
        title: "Prahové alarmy",
        desc: "Nastavte cenové ciele \"nad\" alebo \"pod\". Buďte upozornení, keď akcia prekročí vašu líniu."
      },
      {
        title: "Alarmy zmeny %",
        desc: "Sledujte denné alebo od nákupu percentuálne zmeny. Zachyťte poklesy alebo rast skoro."
      },
      {
        title: "Multi-kanál",
        desc: "E-mailové a push alarmy na Bifolio. Pridajte WhatsApp a alarmy zariadenia na Trefolio."
      },
      {
        title: "Poháňané cronom",
        desc: "Náš systém kontroluje ceny každú minútu počas obchodných hodín. Nikdy nemusíte sledovať obrazovku."
      }
    ],
    tierText: "Bifolio: Až 10 alarmov | Trefolio: Neobmedzené alarmy",
    ctaLabel: "Vytvoriť prvý alarm"
  },
  "feature-broker-import": {
    heading: "Import portf&oacute;lia",
    intro: "Prid&aacute;vate akcie ručne jednu po druhej? Existuje rýchlej&scaron;&iacute; sp&ocirc;sob. trefolio podporuje tri met&oacute;dy importu pre z&iacute;skanie cel&eacute;ho portf&oacute;lia za sekundy.",
    sectionLabel: "Vyberte svoju met&oacute;du:",
    features: [
      {
        title: "Broker Sync",
        desc: "Pripojte svojho brokera a automaticky synchronizujeme va&scaron;e poz&iacute;cie, hotovosť a transakcie. Nastavenie jedn&yacute;m kliknut&iacute;m, vždy aktu&aacute;lne."
      },
      {
        title: "Nahr&aacute;vanie CSV",
        desc: "Exportujte CSV od brokera a nahrajte ho. Podporujeme 20+ form&aacute;tov vr&aacute;tane DEGIRO, Interactive Brokers, Trade Republic a ďal&scaron;&iacute;ch."
      },
      {
        title: "AI Import",
        desc: "Nahrajte ak&yacute;koľvek s&uacute;bor — CSV, PDF alebo screenshot — a na&scaron;a IA ho prevedie do portf&oacute;lia. Funguje aj s neobvykl&yacute;mi form&aacute;tmi."
      }
    ],
    tierText: "Folio: CSV a Ručn&eacute; | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importovať portf&oacute;lio"
  },
  "feature-fundamentals": {
    heading: "Z&aacute;kladn&eacute; &uacute;daje firmy",
    intro: "Choďte za hranice cien akci&iacute;. trefolio vám poskytuje pr&iacute;stup k &uacute;pln&yacute;m firemn&yacute;m financ&iacute;am — rovnak&yacute;m d&aacute;tam, ktor&eacute; pou&zdot;&iacute;vaj&uacute; profesion&aacute;lni analytici.",
    sectionLabel: "Čo z&iacute;skate:",
    features: [
      {
        title: "V&yacute;kaz ziskov a str&aacute;t",
        desc: "Tr&zdot;by, &ccaron;ist&yacute; zisk, mar&zdot;e a zisk na akciu — &ccaron;tvrťro&ccaron;n&eacute; a ro&ccaron;n&eacute;."
      },
      {
        title: "S&uacute;vaha",
        desc: "Akt&iacute;va, pas&iacute;va, &uacute;rovne dlhov a &uacute;&ccaron;etn&aacute; hodnota na prv&yacute; pohľad."
      },
      {
        title: "Tok peňaz&iacute;",
        desc: "Prev&aacute;dzkov&eacute;, investi&ccaron;n&eacute; a finan&ccaron;n&eacute; toky. Zistite, či firma generuje skuto&ccaron;n&uacute; hotovosť."
      },
      {
        title: "Insider obchody",
        desc: "Pozrite sa, čo ved&uacute;ci pracovn&iacute;ci a &ccaron;lenovia predstavenstva nakupuj&uacute; a pred&aacute;vaj&uacute;."
      },
      {
        title: "Instit&uacute;cion&aacute;lne podiely",
        desc: "Sledujte, čo vlastnia veľk&eacute; fondy — Vanguard, BlackRock, Fidelity a ďal&scaron;&iacute;."
      }
    ],
    tierText: "Exkluz&iacute;vne Trefolio Pro",
    ctaLabel: "Presk&uacute;mať fundamenty"
  },
  "feature-stock-screener": {
    heading: "Filter akci&iacute;",
    intro: "Objavte akcie, ktor&eacute; zodpovedaj&uacute; va&scaron;im investi&ccaron;n&yacute;m krit&eacute;ri&aacute;m. Filtrujte 600+ akci&iacute; naprie&ccaron; viacer&yacute;mi rozmerami a aplikujte overen&eacute; strat&eacute;gie.",
    sectionLabel: "Filtrovať podľa:",
    features: [
      {
        title: "6 rozmerov filtru",
        desc: "Trhov&aacute; kapitaliz&aacute;cia, pomer P/E, dividendov&yacute; v&yacute;nos, sektor, krajina a burza. Kombinujte toľko, koľko chcete."
      },
      {
        title: "5 vstavan&yacute;ch strat&eacute;gi&iacute;",
        desc: "Investovanie do hodnoty, rast dividend, momentum, kvalita a small-cap — prednastavenia jedn&yacute;m kliknut&iacute;m."
      },
      {
        title: "Bohat&eacute; d&aacute;ta",
        desc: "Cena, zmena %, trhov&aacute; kapitaliz&aacute;cia, P/E, dividendov&yacute; v&yacute;nos a sektor pre ka&zdot;d&yacute; v&yacute;sledok."
      },
      {
        title: "R&yacute;chle pridanie",
        desc: "Na&scaron;li ste niečo zauj&iacute;mav&eacute;? Pridajte to do portf&oacute;lia alebo zoznamu sledovan&yacute;ch priamo z v&yacute;sledkov."
      }
    ],
    tierText: "Exkluz&iacute;vne Trefolio Pro",
    ctaLabel: "Otvoriť filter"
  },
  "feature-tax-reports": {
    heading: "Daňov&eacute; spr&aacute;vy",
    intro: "Daňov&eacute; priznania nemusia byť bolestiv&eacute;. trefolio generuje spr&aacute;vy &scaron;pecifick&eacute; pre krajinu a obsahuje daňov&eacute;ho asistenta IA pre va&scaron;e ot&aacute;zky.",
    sectionLabel: "Čo z&iacute;skate:",
    features: [
      {
        title: "5 kraj&iacute;n EU",
        desc: "Spr&aacute;vy &scaron;pecifick&eacute; pre krajinu pre N&ecaron;mecko, Franc&uacute;zsko, &Scaron;panielsko, Holandsko a Taliansko."
      },
      {
        title: "Zisky a str&aacute;ty",
        desc: "Vypo&ccaron;&iacute;tan&eacute; kapit&aacute;lov&eacute; zisky, str&aacute;ty a doba dr&zdot;by pre ka&zdot;du poz&iacute;ciu."
      },
      {
        title: "Pr&iacute;jem z dividend",
        desc: "Hrub&eacute; dividendy, zrazov&aacute; daň a &ccaron;ist&yacute; pr&iacute;jem podľa krajiny pôvodu."
      },
      {
        title: "Daňov&yacute; asistent IA",
        desc: "Pýtajte sa ako \"Koľko zrazovej daně som zaplatil z americk&yacute;ch dividend?\" a získajte okam&zdot;it&eacute; odpovede."
      }
    ],
    tierText: "Exkluz&iacute;vne Trefolio Pro",
    ctaLabel: "Generovať daňov&uacute; spr&aacute;vu"
  },
  "feature-portfolio-simulator": {
    heading: "Simul&aacute;tor portf&oacute;lia",
    intro: "Otestujte svoje investi&ccaron;n&eacute; n&aacute;pady pred vlo&zdot;en&iacute;m skuto&ccaron;n&yacute;ch peňaz&iacute;. Simul&aacute;tor umo&zdot;&nacute;uje backtest, stresov&eacute; testy a sk&uacute;manie what-if sc&eacute;n&aacute;rov.",
    sectionLabel: "Tri re&zdot;imy:",
    features: [
      {
        title: "Backtest",
        desc: "Pozrite sa, ako by portf&oacute;lio historicky performovalo. Porovnajte so S&P 500, MSCI World alebo vlastn&yacute;m benchmarkom."
      },
      {
        title: "Stresov&eacute; testy",
        desc: "Čo keby trh klesol o 30%? A čo rast&uacute;ce sadzby? Uvid&iacute;te, ako si portf&oacute;lio vedie v r&oacute;znych sc&eacute;n&aacute;roch."
      },
      {
        title: "What-if anal&yacute;za",
        desc: "Prid&aacute;vajte alebo odoberajte poz&iacute;cie, men&iacute;te alok&aacute;cie a okam&zdot;ite uvid&iacute;te dopad na riziko a v&yacute;nos."
      }
    ],
    tierText: "Exkluz&iacute;vne Trefolio Pro",
    ctaLabel: "Otvoriť simul&aacute;tor"
  },
  "feature-net-worth": {
    heading: "Sledovanie &ccaron;ist&eacute;ho majetku",
    intro: "Va&scaron;e invest&iacute;cie sú len &ccaron;&aacute;sťou va&scaron;ich financ&iacute;. Sledujte všetko — nehnuteľnosti, &uacute;spory, dôchodky a viac — na jednom mieste.",
    sectionLabel: "Čo m&uacute;&zdot;ete sledovať:",
    features: [
      {
        title: "Nehnuteľnosti",
        desc: "Prid&aacute;vajte nehnuteľnosti s aktu&aacute;lnou hodnotou. Aktualizujte pri zmene trhov&yacute;ch podmienok."
      },
      {
        title: "Sporiace &uacute;čty",
        desc: "Sledujte hotovosť v bank&aacute;ch v r&oacute;znych men&aacute;ch."
      },
      {
        title: "Dôchodky a poistenie",
        desc: "Zahrňte dôchodkov&eacute; fondy a životn&eacute; poistenie do svojho &ccaron;ist&eacute;ho majetku."
      },
      {
        title: "Celkov&yacute; &ccaron;ist&yacute; majetok",
        desc: "Zobrazte všetko kombinovan&eacute;: akcie + ETFs + krypto + nehnuteľnosti + &uacute;spory + dôchodky = v&aacute;&scaron; kompletn&yacute; obraz."
      }
    ],
    tierText: "Bifolio: Až 10 aktív | Trefolio: Až 999 aktív",
    ctaLabel: "Pridať manu&aacute;lne aktíva"
  },
  "feature-crypto": {
    heading: "Krypto portf&oacute;lio",
    intro: "Sledujte krypto vedľa svojich akci&iacute; a ETF. Z&iacute;skajte rovnak&uacute; &uacute;roveň anal&yacute;zy a poznatkov pre va&scaron;e krypto poz&iacute;cie.",
    sectionLabel: "Čo z&iacute;skate:",
    features: [
      {
        title: "Krypto dashboard",
        desc: "Ceny, 24h zmeny, objem a trhov&aacute; kapitaliz&aacute;cia hlavn&yacute;ch kryptomien."
      },
      {
        title: "Sledovanie portf&oacute;lia",
        desc: "Prid&aacute;vajte krypto poz&iacute;cie vedľa akci&iacute;. Zobrazte zjednoten&uacute; hodnotu a alok&aacute;ciu portf&oacute;lia."
      },
      {
        title: "Grafy a hist&oacute;ria",
        desc: "Cenov&eacute; grafy s viacer&yacute;mi &ccaron;asov&yacute;mi r&aacute;mcami a prekryvmi menov&yacute;ch kurzov."
      },
      {
        title: "Krypto anal&yacute;za IA",
        desc: "Op&iacute;tajte sa na&scaron;ej IA na ak&uacute;koľvek krypto — fundamenty, trendy a trhov&uacute; anal&yacute;zu."
      }
    ],
    tierText: "Folio: Prehľad trhu | Trefolio: Pln&eacute; sledovanie portf&oacute;lia a IA",
    ctaLabel: "Presk&uacute;mať krypto"
  }
};
