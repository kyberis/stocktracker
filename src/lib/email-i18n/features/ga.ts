import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Fuair t&uacute; an r-phost seo &oacute; trefolio.",
  unsubscribeLabel: "D&iacute;liost&aacute;il"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Luacháin fíor-ama",
    intro: "Nuashonraíonn do phainéal portafóil na praghsanna beo i rith an lae trádála — gan athnuachan láimhe de dhíth.",
    sectionLabel: "Cad a fhaigheann tú:",
    features: [
      {
        title: "60+ malartáin",
        desc: "Praghsanna ó NYSE, NASDAQ, Euronext, Londain, Frankfurt agus níos mó — powered by Yahoo Finance."
      },
      {
        title: "Uath-athnuachan",
        desc: "Athnuachann na luacháin gach 15 soicind (rétithe go 30s nó 60s sna socruithe)."
      },
      {
        title: "Il-airgeadra",
        desc: "Feic luachanna i do airgeadra áitiúil. Tacaímid le 21 airgeadra le comhshó uathoibríoch."
      }
    ],
    tierText: "Ar fáil ar gach plean",
    ctaLabel: "Oscail do phainéal"
  },
  "feature-dividend-tracking": {
    heading: "Rianáil ar dhividinní",
    intro: "Braitheann trefolio dividinní go huathoibríoch ó do shealbhanna agus tógann sé pictiúr iomlán ioncaim.",
    sectionLabel: "Cad a fhaigheann tú:",
    features: [
      {
        title: "Féilire ddividinní",
        desc: "Feic íocaíochtaí atá le teacht mí ar mhí. Bíodh a fhios agat go díreach cathain a thagann na ddividinní ar do chuntas."
      },
      {
        title: "Ioncaim bhliantúil",
        desc: "Ioncaim ddividinní réamh-mheasta iomlán ar fud do phortafóil go léir le miondealú in aghaidh an stoc."
      },
      {
        title: "Torthúlacht ar chostas",
        desc: "Rian do thorthúlacht fíor bunaithe ar phraghas ceannaigh — ní hamháin an ráta ddividinní reatha."
      },
      {
        title: "Imitiú DRIP",
        desc: "Feic conas a d'fhéadfadh ath-infheistiú ddividinní do thorthaíocht a chomhchodú thar 5, 10 nó 20 bliain."
      }
    ],
    tierText: "Ar fáil ar gach plean",
    ctaLabel: "Féach ar do ddividinní"
  },
  "feature-ai-analysis": {
    heading: "Anailís stoic le IA",
    intro: "Fiafraigh dár n-IA faoi aon stoc i do phortafóil nó aon ticker atá á mheas agat. Faigh anailís ar chaighdeán institiúideach i soicindí.",
    sectionLabel: "Cad is féidir leat a fhiafraí:",
    features: [
      {
        title: "Anailís thorthaí",
        desc: "\"Conas a bhí torthaí deireanacha AAPL?\" — achoimre ar thorthaí, treoracha agus imoibriú an mhargaidh."
      },
      {
        title: "Measúnú riosca",
        desc: "\"Cad iad na rioscaí a bhaineann le TSLA a shealbhú?\" — bagairtí iomaíocha, luacháil agus fachtóirí macra."
      },
      {
        title: "Comparáid iomaitheoirí",
        desc: "\"Comparáid MSFT vs GOOG\" — anailís taobh le taobh ar airgeadais, fás agus luacháil."
      },
      {
        title: "Athbhreithniú portafóil",
        desc: "\"Athbhreithnigh mo phortafóil\" — déanann an IA anailís ar do leithdháileadh, riosca agus molann feabhsuithe."
      }
    ],
    tierText: "Folio: 5 glaonna/mí | Bifolio: 20/mí | Trefolio: Gan teoranta",
    ctaLabel: "Bain triail as anailís IA anois"
  },
  "feature-price-alerts": {
    heading: "Foláirim praghsanna",
    intro: "Ná caill gluaiseacht praghais tábhachtach. Socraigh spriocphraghsanna agus faigh fógra nuair a thrasnaíonn stoc do tairsigh.",
    sectionLabel: "Conas a oibríonn sé:",
    features: [
      {
        title: "Foláirim tairsigh",
        desc: "Socraigh spriocanna praghais \"os cionn\" nó \"faoi bhun\". Faigh fógra nuair a thrasnaíonn stoc do líne."
      },
      {
        title: "Foláirim athrú céatadáin",
        desc: "Rian athruithe céatadáin laethúla nó ó cheannach. Beir ar thitithe nó ar ardú go luath."
      },
      {
        title: "Il-chainéal",
        desc: "Foláirim r-phost agus push ar Bifolio. Cuir WhatsApp agus foláirim gléas ar Trefolio."
      },
      {
        title: "Cron-phoinn",
        desc: "Seiceálann ár gcóras praghsanna gach nóiméad le linn uaireanta an mhargaidh. Ní gá duit an scáileán a fheiceáil riamh."
      }
    ],
    tierText: "Bifolio: Suas le 10 foláirim | Trefolio: Foláirim gan teorainn",
    ctaLabel: "Cruthaigh do chéad fholáirim"
  },
  "feature-broker-import": {
    heading: "Iompórtáil phortafóil",
    intro: "Ag cur stoic láimhe ceann ar cheann? Tá bealach níos tapúla ann. Tacaíonn trefolio le trí mhodh iompórtála chun do phortafóil iomlán a fháil i soicindí.",
    sectionLabel: "Roghnaigh do mhodh:",
    features: [
      {
        title: "Sync Bróicéir",
        desc: "Ceangail do bhróicéireacht agus déanaimid sync uathoibríoch ar do shealbhanna, airgead tirim agus idirbhearta. Socraigh le aon chliceáil, i gcónaí cothrom le dáta."
      },
      {
        title: "Uaslódáil CSV",
        desc: "Easpórtáil CSV ó do bhróicéir agus uaslódáil é. Tacaímid le 20+ formáid bróicéir lena n-áirítear DEGIRO, Interactive Brokers, Trade Republic agus níos mó."
      },
      {
        title: "Iompórtáil IA",
        desc: "Uaslódáil aon chomhad — CSV, PDF nó screenshot — agus déanfaidh ár n-IA é a pharsáil isteach i do phortafóil. Oibríonn fiú le formáidí neamhghnácha."
      }
    ],
    tierText: "Folio: CSV agus Lámh | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Iompórtáil do phortafóil"
  },
  "feature-fundamentals": {
    heading: "Bunús na cuideachta",
    intro: "Téigh thar phraghsanna stoc. Tugann trefolio rochtain ort ar airgeadais iomlána na cuideachta — na sonraí céanna a úsáideann anailísithe gairmiúla.",
    sectionLabel: "Cad a fhaigheann tú:",
    features: [
      {
        title: "Ráiteas ioncaim",
        desc: "Ioncam, ioncam glan, corrlaigh agus tuilleamh in aghaidh scaire — ráithiúil agus bliantúil."
      },
      {
        title: "Cothromas maoin",
        desc: "Sócmhainní, dliteanais, leibhéil fiacha agus luach leabhair ar an bpointe boise."
      },
      {
        title: "Sreabhadh airgid",
        desc: "Sreabhanna oibriúcháin, infheistíochta agus maoinithe. Féach an ghiniúint an chuideachta airgead fíor."
      },
      {
        title: "Idirbhearta insiders",
        desc: "Féach cad a cheannaíonn agus a dhíolann feidhmeannaigh agus stiúrthóirí."
      },
      {
        title: "Sealbhúcháin institiúideacha",
        desc: "Rian cad a bhfuil ag na cistí móra — Vanguard, BlackRock, Fidelity agus níos mó."
      }
    ],
    tierText: "Eisiach Trefolio Pro",
    ctaLabel: "Iniúch na bunús"
  },
  "feature-stock-screener": {
    heading: "Scagaire stoc",
    intro: "Aimsigh stoic a fhreagraíonn do chritéir infheistíochta. Scag 600+ stoc thar toisí iolracha agus cuir straitéisí cruthaithe i bhfeidhm.",
    sectionLabel: "Scag de réir:",
    features: [
      {
        title: "6 toisí scagaire",
        desc: "Caipiteal margaidh, cóimheas P/E, torthúlacht divident, earnáil, tír agus malartán. Comhcheangail an oiread is mian leat."
      },
      {
        title: "5 straitéisí leabaithe",
        desc: "Infheistíocht luacha, fás divident, móiminteam, cáilíocht agus cuideachtaí beaga — réamhshocruithe le cliceáil amháin."
      },
      {
        title: "Sonraí saibhir",
        desc: "Praghas, athrú %, caipiteal margaidh, P/E, torthúlacht divident agus earnáil do gach toradh."
      },
      {
        title: "Cur leis go tapa",
        desc: "Fuair tú rud suimiúil? Cuir leis do phortafóil nó liosta faireacháin go díreach ó na torthaí."
      }
    ],
    tierText: "Eisiach Trefolio Pro",
    ctaLabel: "Oscail an scagaire"
  },
  "feature-tax-reports": {
    heading: "Tuairiscí cánach",
    intro: "Ní gá go mbeadh r&aacute;itis ch&aacute;nach pianmhar. Gineann trefolio tuairisc&iacute; ch&aacute;nach ar leith do th&iacute;r agus cuims&iacute;onn C&uacute;nt&oacute;ir C&aacute;nach IA do do cheisteanna.",
    sectionLabel: "Cad a fhaigheann t&uacute;:",
    features: [
      {
        title: "5 t&iacute;ortha AE",
        desc: "Tuairisc&iacute; ar leith do th&iacute;r don Ghearm&aacute;in, an Fhrainc, an Sp&aacute;inn, an &Iacute;silt&iacute;r agus an Iod&aacute;il."
      },
      {
        title: "Gn&oacute;thach agus caillteanais",
        desc: "Gn&oacute;thach caipitil r&iacute;ofa, caillteanais agus tr&eacute;imhse sealbhaithe do gach seasamh."
      },
      {
        title: "Ioncaim divident",
        desc: "Divident&iacute; br&uacute;ite, c&aacute;in &iacute;oc &oacute; fhoinse agus ioncam glan de r&eacute;ir t&iacute;re t&oacute;ra."
      },
      {
        title: "C&uacute;nt&oacute;ir C&aacute;nach IA",
        desc: "Cuir ceisteanna mar \"C&eacute; mh&eacute;ad c&aacute;in &iacute;oc &oacute; fhoinse a d&iacute;ol m&eacute; ar dhividend&iacute; Mheirice&aacute;?\" agus faigh freagra&iacute; l&aacute;ithreacha."
      }
    ],
    tierText: "Eisiach Trefolio Pro",
    ctaLabel: "Gin do thuairisc ch&aacute;nach"
  },
  "feature-portfolio-simulator": {
    heading: "Imitheoir portafóil",
    intro: "Tástáil do smaointe infheistíochta sula gceanglaíonn tú airgead fíor. Ligeann an t-imitheoir backtest, tástáil strus agus iniúchadh ar chásanna what-if a dhéanamh.",
    sectionLabel: "Trí mhodh:",
    features: [
      {
        title: "Backtest",
        desc: "Féach conas a d'fheidhmíodh portafóil go stairiúil. Comparáid le S&P 500, MSCI World nó marc tomhais saincheaptha."
      },
      {
        title: "Tástáil strus",
        desc: "Cad má thiteann an margadh 30%? Cad faoi rátaí ag ardú? Féach conas a sheasann do phortafóil faoi chásanna éagsúla."
      },
      {
        title: "Anailís what-if",
        desc: "Cuir poist leis nó bain iad, athraigh leithdháilí agus feic an tionchar ar riosca agus toradh láithreach."
      }
    ],
    tierText: "Eisiach Trefolio Pro",
    ctaLabel: "Oscail an t-imitheoir"
  },
  "feature-net-worth": {
    heading: "Rianúint ar luach glan",
    intro: "Ní hamháin cuid de do chuid airgeadais iad do infheistíochtaí. Rianaigh gach rud — eastát réadach, coigiltis, pinsin agus níos mó — in aon áit amháin.",
    sectionLabel: "Cad is féidir leat a rianú:",
    features: [
      {
        title: "Eastát réadach",
        desc: "Cuir maoine leis le luach reatha. Nuashonraigh nuair a athraíonn coinníollacha an mhargaidh."
      },
      {
        title: "Cuntais choigilte",
        desc: "Rianaigh airgead tirim i mbainc ar fud airgeadraí éagsúla."
      },
      {
        title: "Pinsin agus árachas",
        desc: "Cuir cistí pinsin agus polasaithe árachais saoil san áireamh i do luach glan."
      },
      {
        title: "Luach glan iomlán",
        desc: "Feic gach rud le chéile: stocanna + ETFs + cripte + eastát réadach + coigiltis + pinsin = do phictiúr iomlán."
      }
    ],
    tierText: "Bifolio: Suas le 10 sócmhainní | Trefolio: Suas le 999 sócmhainní",
    ctaLabel: "Cuir sócmhainní láimhe leis"
  },
  "feature-crypto": {
    heading: "Portafóil cripte",
    intro: "Rianaigh cripte in éineacht le do stocanna agus ETFanna. Faigh an leibhéal céanna anailíse agus léargais do do phoist cripte.",
    sectionLabel: "Cad a fhaigheann tú:",
    features: [
      {
        title: "Painéal cripte",
        desc: "Praghsanna, athruithe 24h, toirt agus caipiteal margaidh do na príomh-chripteaighneánra."
      },
      {
        title: "Rianú portafóil",
        desc: "Cuir poist cripte leis in éineacht le stocanna. Feic luach agus leithdháilí aontaithe an phortafóil."
      },
      {
        title: "Cairteacha agus stair",
        desc: "Cairteacha praghsanna le il-frámaí ama agus forluí ar rátaí malairte."
      },
      {
        title: "Anailís cripte IA",
        desc: "Fiafraigh dár n-IA faoi aon chripte — bunús, treochtaí agus anailís margaidh."
      }
    ],
    tierText: "Folio: Forbhreathnú margaidh | Trefolio: Rianú iomlán portafóil agus IA",
    ctaLabel: "Iniúch cripte"
  }
};
