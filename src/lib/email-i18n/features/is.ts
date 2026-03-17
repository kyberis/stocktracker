import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Þ&uacute; f&eacute;kk þennan t&oacute;lkuboð fr&aacute; trefolio.",
  unsubscribeLabel: "Afskr&aacute;ning"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Raunt&iacute;makurssir",
    intro: "Eignasafnsyfirlit &iacute;&eth;itt uppf&aelig;rir ver&eth; &iacute; beinni &uacute;tsendingu &iacute; gegnum alla vi&eth;skiptadaginn — engin handvirk endurn&yacute;jun &aacute;n&aelig;g&ouml;.",
    sectionLabel: "Hva&eth; þ&uacute; f&aelig;r:",
    features: [
      {
        title: "60+ kauph&ouml;llir",
        desc: "Ver&eth; fr&aacute; NYSE, NASDAQ, Euronext, London, Frankfurt og fleira — powered by Yahoo Finance."
      },
      {
        title: "Sj&aacute;lfvirkt uppf&aelig;rsla",
        desc: "Kurssir uppf&aelig;rast &aacute; 15 sek&uacute;ndna fresti (stillanlegt &aacute; 30s e&eth;a 60s &iacute; stillingum)."
      },
      {
        title: "Fj&ouml;l-gjaldeyri",
        desc: "Sja&eth;u gildi &iacute; sta&eth;bundnu gjaldeyri &iacute;&eth;&iacute;nu. Vi&eth; sty&eth;jum 21 gjaldeyri me&eth; sj&aacute;lfvirku umbreytingu."
      }
    ],
    tierText: "Tilt&aelig;k &iacute; &ouml;llum &aacute;ætlunum",
    ctaLabel: "Opna yfirlit"
  },
  "feature-dividend-tracking": {
    heading: "Arðsleit",
    intro: "trefolio finnur sj&aacute;lfkrafa arð af eignum &iacute;&eth;&iacute;num og byggir upp heildarmynd af tekjum.",
    sectionLabel: "Hva&eth; þ&uacute; f&aelig;r:",
    features: [
      {
        title: "Arðskalendari",
        desc: "Sja&eth;u komandi grei&eth;slur m&aacute;na&eth; fyrir m&aacute;na&eth;. Vit&eth;u n&aelig;gjanlega hven&aelig;r arður lendir &aacute; reikningnum &iacute;&eth;&iacute;num."
      },
      {
        title: "&Aacute;rlegar tekjur",
        desc: "Heildar sp&aacute;&eth;ar arðstekjur yfir allt eignasafn &iacute;&eth;&iacute;tt me&eth; sundurli&eth;un eftir hlutabréfum."
      },
      {
        title: "&Aacute;v&ouml;xtun &aacute; kostna&eth;i",
        desc: "Fylgstu me&eth; raunverulegri &aacute;v&ouml;xtun &iacute;&eth;&iacute;nn bygg&eth;a &aacute; kaupver&eth;i — ekki bara n&uacute;verandi arðshlutfalli&eth;."
      },
      {
        title: "DRIP hermir",
        desc: "Sja&eth;u hvernig endurfj&aacute;rfesting arðs g&aelig;ti auki&eth; &aacute;v&ouml;xtun &iacute;&eth;&iacute;na &iacute; 5, 10 e&eth;a 20 &aacute;r."
      }
    ],
    tierText: "Tilt&aelig;k &iacute; &ouml;llum &aacute;ætlunum",
    ctaLabel: "Sko&eth;a arð &iacute;&eth;&iacute;nn"
  },
  "feature-ai-analysis": {
    heading: "AI hlutabréfa greining",
    intro: "Spurðu AI okkar um hvaða hlutabréf sem er í eignasafninu þínu eða hvaða ticker sem þú ert að íhuga. Fáðu greiningu á stofnunarhæfu gæðum á sekúndum.",
    sectionLabel: "Hvað þú getur spurt:",
    features: [
      {
        title: "Ársreiknings greining",
        desc: "\"Hvernig voru síðustu ársreikningar AAPL?\" — samantekt á niðurstöðum, leiðbeiningum og markaðsviðbrögðum."
      },
      {
        title: "Áhættumatið",
        desc: "\"Hverjar eru áhætturnar af að eiga TSLA?\" — samkeppnishættir, mat og makró þættir."
      },
      {
        title: "Samkeppnisaðila samanburður",
        desc: "\"Bera saman MSFT vs GOOG\" — hlið við hlið greining á fjármálum, vexti og mati."
      },
      {
        title: "Eignasafns yfirlit",
        desc: "\"Fara yfir eignasafn mitt\" — AI greinir úthlutun, áhættu og leggur til úrbætur."
      }
    ],
    tierText: "Folio: 5 símtöl/mán. | Bifolio: 20/mán. | Trefolio: Ótakmarkað",
    ctaLabel: "Prófaðu AI greiningu núna"
  },
  "feature-price-alerts": {
    heading: "Verðviðvaranir",
    intro: "Missið aldrei mikilvæga verðhreyfingu. Stillið markverð og fáið tilkynningu þegar hlutabréf fer yfir þröskuld þinn.",
    sectionLabel: "Hvernig það virkar:",
    features: [
      {
        title: "Þröskulds viðvaranir",
        desc: "Settið \"yfir\" eða \"undir\" verðmörk. Fáið tilkynningu þegar hlutabréf fer yfir línu þína."
      },
      {
        title: "Prósentubreytingar viðvaranir",
        desc: "Fylgist með daglegum eða frá-kaup prósentubreytingum. Náðu í lækkun eða hækkun snemma."
      },
      {
        title: "Fjölrás",
        desc: "Tölvupóstur og push viðvaranir á Bifolio. Bætið við WhatsApp og tækja viðvörunum á Trefolio."
      },
      {
        title: "Cron knúið",
        desc: "Kerfið okkar athugar verð á mínútu fresti á markaðstímum. Þú þarft aldrei að horfa á skjáinn."
      }
    ],
    tierText: "Bifolio: Allt að 10 viðvaranir | Trefolio: Ótakmarkaðar viðvaranir",
    ctaLabel: "Búðu til fyrstu viðvörun"
  },
  "feature-broker-import": {
    heading: "Eignasafns innflutningur",
    intro: "Bætir þú hlutabréfum handvirkt einu í einu? Það er hraðari leið. trefolio styður þrjár innflutningsaðferðir til að fá fullt eignasafn á sekúndum.",
    sectionLabel: "Veldu aðferð þína:",
    features: [
      {
        title: "Broker samstillt",
        desc: "Tengdu miðlarann þinn og við samstillum sjálfkrafa eignir, reiðufé og viðskipti. Uppsetning með einum smelli, alltaf uppfærð."
      },
      {
        title: "CSV hleðsla",
        desc: "Flytja út CSV frá miðlara og hlaða upp. Við styðjum 20+ miðlaraformát þ.m.t. DEGIRO, Interactive Brokers, Trade Republic og fleira."
      },
      {
        title: "AI innflutningur",
        desc: "Hladdu upp hvaða skrá sem er — CSV, PDF eða skjámynd — og AI okkar mun breyta henni í eignasafn þitt. Virkar jafnvel með óvenjulegum formátum."
      }
    ],
    tierText: "Folio: CSV og Handvirk | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Flytja inn eignasafn þitt"
  },
  "feature-fundamentals": {
    heading: "Grunnuppl&yacute;singar fyrirt&aelig;kis",
    intro: "Fari&eth; &uacute;t &uacute;r hlutabréfaver&eth;i. trefolio gefur &thorn;&eacute;r a&eth;gang a&eth; fullum fj&aacute;rm&aacute;lum fyrirt&aelig;kis — s&ouml;mu g&ouml;gnum og faglegir s&eacute;rfr&aelig;&eth;ingar nota.",
    sectionLabel: "Hva&eth; þ&uacute; f&aelig;r:",
    features: [
      {
        title: "Rekstrarreikningur",
        desc: "Tekjur, hreinar tekjur, framleg&eth; og hagna&eth;ur &aacute; hlut — &aacute;rsfj&ouml;r&eth;ungslega og &aacute;rlega."
      },
      {
        title: "Efnahagsreikningur",
        desc: "Eignir, skuldbindingar, skul&eth;astig og b&oacute;kf&aelig;rt ver&eth; &iacute; einu augnabliki."
      },
      {
        title: "Sj&oacute;&eth;streymi",
        desc: "Rekstrar-, fj&aacute;rfestingar- og fj&aacute;rm&uacute;nastreymi. Sj&aacute;&eth; hvort fyrirt&aelig;ki&eth; myndar raunverulegt rei&eth;uf&eacute;."
      },
      {
        title: "Innherjavi&eth;skipti",
        desc: "Sj&aacute;&eth; hva&eth; stj&oacute;rnendur og stj&oacute;rnarmenn kaupa og selja."
      },
      {
        title: "Stofnanahald",
        desc: "Fylgstu me&eth; &thorn;v&iacute; hva&eth; st&oacute;ru sj&oacute;&eth;ir eiga — Vanguard, BlackRock, Fidelity og fleira."
      }
    ],
    tierText: "Einkarétt Trefolio Pro",
    ctaLabel: "Kanna grunnuppl&yacute;singar"
  },
  "feature-stock-screener": {
    heading: "Hlutabréfa síun",
    intro: "Uppgötva&eth;u hlutabréf sem passa vi&eth; fj&aacute;rfestingarkriter&iacute;ur &thorn;&iacute;n. S&iacute;a 600+ hlutabréf &aacute; m&ouml;rgum v&iacute;ddum og noti&eth;u reynslu s&ouml;lna stefnu.",
    sectionLabel: "S&iacute;a eftir:",
    features: [
      {
        title: "6 s&iacute;unar v&iacute;ddir",
        desc: "Marka&eth;sver&eth;, V/H hlutfall, ar&eth;semi ar&eth;s, geiri, land og kauph&ouml;ll. Sameina&eth;u eins m&ouml;rg og &thorn;&uacute; vilt."
      },
      {
        title: "5 innbygg&eth;ar stefnur",
        desc: "Gildis fj&aacute;rfesting, ar&eth;svextur, hreyfimagn, g&aelig;&eth;i og l&iacute;tlar fyrirt&aelig;ki — fyrirfram stillingar me&eth; einum smelli."
      },
      {
        title: "R&iacute;k g&ouml;gn",
        desc: "Ver&eth;, breyting %, marka&eth;sver&eth;, V/H, ar&eth;semi ar&eth;s og geiri fyrir hvern ni&ethurst&ouml;&eth;u."
      },
      {
        title: "Fl&yacute;ttur vi&eth;b&oacute;t",
        desc: "Fannst &thorn;&eacute;r eitthva&eth; &aacute;hugavert? B&aelig;ttu &thorn;v&iacute; vi&eth; eignasafn e&eth;a eftirlitslista beint fr&aacute; ni&ethurst&ouml;&eth;um."
      }
    ],
    tierText: "Einkarétt Trefolio Pro",
    ctaLabel: "Opna s&iacute;una"
  },
  "feature-tax-reports": {
    heading: "Skattask&yacute;rslur",
    intro: "Skattayfirlit &thorn;urfa ekki a&eth; vera s&aacute;r. trefolio framlei&eth;ir lands&aacute;kv&aelig;ðar skattask&yacute;rslur og inniheldur AI Skatta&aacute;s&iacute;stent fyrir spurningar &thorn;&iacute;nar.",
    sectionLabel: "Hva&eth; þ&uacute; f&aelig;r:",
    features: [
      {
        title: "5 ESB l&ouml;nd",
        desc: "Lands&aacute;kv&aelig;ðar sk&yacute;rslur fyrir &THORN;&yacute;skaland, Frakkland, Sp&aacute;n, Holland og &Iacute;tal&iacute;u."
      },
      {
        title: "Hagna&eth;ur og tap",
        desc: "Reikna&eth;ir h&aelig;f&eth;ar hagna&eth;ir, tap og eignart&iacute;mi fyrir hverja st&ouml;&eth;u."
      },
      {
        title: "Ar&eth;s tekjur",
        desc: "Br&uacute;tt&ouml; ar&eth;s, sta&eth;bundinn skattur og hreinar tekjur eftir uppruna landi."
      },
      {
        title: "AI Skatta&aacute;s&iacute;stent",
        desc: "Spur&eth;u spurningar eins og \"Hversu miki&eth; sta&eth;bundi&eth; skatt grei&eth;di &eacute;g af bandar&iacute;skum ar&eth;s?\" og f&aacute;&eth;u samstundis sv&ouml;r."
      }
    ],
    tierText: "Einkar&eacute;tt Trefolio Pro",
    ctaLabel: "Framlei&eth;a skattask&yacute;rslu"
  },
  "feature-portfolio-simulator": {
    heading: "Eignasafns hermir",
    intro: "Pr&oacute;fa&eth;u fj&aacute;rfestingarhugmyndir &thorn;&iacute;nar &aacute;&eth;ur en &thorn;&uacute; skuldbindir raunverulegt f&eacute;. Hermirinn l&aelig;tur &thorn;&iacute;g gera tilbakat&iacute;ma, &aacute;lagapr&oacute;fanir og kanna what-if atbur&eth;ar&aacute;sir.",
    sectionLabel: "&THORN;rj&aacute;r stillingar:",
    features: [
      {
        title: "Tilbakat&iacute;mi",
        desc: "Sj&aacute;&eth;u hvernig eignasafn hef&eth;i sta&eth;i&eth; s&iacute;&eth;ar. Bera saman vi&eth; S&P 500, MSCI World e&eth;a s&eacute;rsni&eth;in vi&eth;mi&eth;."
      },
      {
        title: "&Aacute;lagapr&oacute;fun",
        desc: "Hva&eth; ef marka&eth;urinn l&aelig;kkar 30%? Hva&eth; um h&aelig;kkandi v&iacute;xti? Sj&aacute;&eth;u hvernig eignasafn &thorn;&iacute;n &thorn;olir undir mismunandi atbur&eth;ar&aacute;sir."
      },
      {
        title: "What-if greining",
        desc: "B&aelig;ttu vi&eth; st&ouml;&eth;ur e&eth;a fjarl&aelig;g&eth;u &thorn;&eacute;r, breyttu &uacute;thlutun og sj&aacute;&eth;u strax &aacute;hrif &aacute; &aacute;h&aelig;ttu og &aacute;v&ouml;xtun."
      }
    ],
    tierText: "Einkar&eacute;tt Trefolio Pro",
    ctaLabel: "Opna herminn"
  },
  "feature-net-worth": {
    heading: "Eignir og skuldir rakning",
    intro: "Fj&aacute;rfestingar &thorn;&iacute;nar eru a&ethe;eins hluti af fj&aacute;rm&aacute;lum &thorn;&iacute;num. Fylgstu me&eth; &ouml;llu — fasteignum, sparna&eth;i, l&iacute;feyrissj&oacute;&eth;um og meira — &iacute; einu sta&eth;i.",
    sectionLabel: "Hva&eth; þ&uacute; getur fylgst me&eth;:",
    features: [
      {
        title: "Fasteignir",
        desc: "B&aelig;ttu vi&eth; eignir me&eth; n&uacute;verandi vir&eth;i. Uppf&aelig;r&eth;u &thorn;egar marka&eth;s&aacute;stand breytist."
      },
      {
        title: "Sparna&eth;arreikningar",
        desc: "Fylgstu me&eth; rei&eth;uf&eacute; &iacute; b&ouml;nkum &aacute; t&iacute;v&iacute;s mismunandi gjaldmi&eth;la."
      },
      {
        title: "L&iacute;feyrir og tryggingar",
        desc: "Innifela&eth;u l&iacute;feyrissj&oacute;&eth;i og l&iacute;ftryggingastefnu &iacute; eignir og skuldir."
      },
      {
        title: "Heildar eignir og skuldir",
        desc: "Sja&eth;u allt sameina&eth;: hlutabr&eacute;f + ETFs + dulritunargjaldmi&eth;lar + fasteignir + sparna&eth;ur + l&iacute;feyrir = heildarmynd &thorn;&iacute;n."
      }
    ],
    tierText: "Bifolio: Allt a&eth; 10 eignir | Trefolio: Allt a&eth; 999 eignir",
    ctaLabel: "B&aelig;ta vi&eth; handvirkar eignir"
  },
  "feature-crypto": {
    heading: "Dulritunarsafn",
    intro: "Fylgstu me&eth; dulritunargjaldmi&eth;lum &aacute; sama t&iacute;ma og hlutabr&eacute;fum og ETF. F&aacute;&eth;u s&ouml;mu greiningar- og inns&aelig;gnarstig fyrir dulritunarsafn &thorn;&iacute;n.",
    sectionLabel: "Hva&eth; þ&uacute; f&aelig;r:",
    features: [
      {
        title: "Dulritunaryfirlit",
        desc: "Ver&eth;, 24kl breytingar, magn og marka&eth;sver&eth; fyrir efstu dulritunargjaldmi&eth;la."
      },
      {
        title: "Eignasafns rakning",
        desc: "B&aelig;ttu vi&eth; dulritunarsafn &aacute; sama t&iacute;ma og hlutabr&eacute;f. Sj&aacute;&eth;u sameina&eth; eignasafnsver&eth; og &uacute;thlutun."
      },
      {
        title: "Rit og saga",
        desc: "Ver&eth;arit me&eth; m&ouml;rgum t&iacute;mar&aacute;mum og gengislag."
      },
      {
        title: "AI Dulritunargreining",
        desc: "Spur&eth;u AI okkar um hva&eth;a dulritunargjaldmi&eth;il sem er — grunnuppl&yacute;singar, stefnur og marka&eth;sgreining."
      }
    ],
    tierText: "Folio: Marka&eth;syfirlit | Trefolio: Full eignasafns rakning og AI",
    ctaLabel: "Kanna dulritunargjaldmi&eth;la"
  }
};
