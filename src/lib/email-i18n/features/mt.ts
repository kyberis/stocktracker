import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Irċevejt dan l-email minn trefolio.",
  unsubscribeLabel: "Ċedi mill-abbonament"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Kotazzjonijiet f'żmien reali",
    intro: "Id-dashboard tal-portfolju tiegħek jaġġorna l-prezzijiet live matul il-ġurnata tal-kummerċ — ebda aġġornament manwali meħtieġ.",
    sectionLabel: "Dak li tikseb:",
    features: [
      {
        title: "60+ borżi",
        desc: "Prezzijiet minn NYSE, NASDAQ, Euronext, Londra, Frankfurt u aktar — powered by Yahoo Finance."
      },
      {
        title: "Awtomatiċi aġġornament",
        desc: "Il-kotazzjonijiet jaġġornaw kull 15 sekonda (konfigurabbli għal 30s jew 60s fis-settings)."
      },
      {
        title: "Multi-valuta",
        desc: "Ara valuri fil-valuta lokali tiegħek. Nappoġġaw 21 valuta bi konverżjoni awtomatika."
      }
    ],
    tierText: "Disponibbli fuq kull pjan",
    ctaLabel: "Iftaħ id-dashboard"
  },
  "feature-dividend-tracking": {
    heading: "Traċċar tad-dividendi",
    intro: "trefolio jiddetermina awtomatikament id-dividendi mill-pożizzjonijiet tiegħek u jibni stampa sħiħa ta' dħul.",
    sectionLabel: "Dak li tikseb:",
    features: [
      {
        title: "Kalendarju tad-dividendi",
        desc: "Ara l-ħlasijiet li ġejjin xahar b'xahar. Kun af eżattament meta d-dividendi jaslu fuq il-kont tiegħek."
      },
      {
        title: "Dħul annwali",
        desc: "Dħul totali projettat tad-dividendi fuq il-portfolju kollu tiegħek b'qsim skond l-istokk."
      },
      {
        title: "Rendiment fuq l-ispiża",
        desc: "Segwi r-rendiment reali tiegħek ibbażat fuq il-prezz tal-xiri — mhux biss ir-rata attwali tad-dividendi."
      },
      {
        title: "Simulazzjoni DRIP",
        desc: "Ara kif ir-reinvestiment tad-dividendi jista' jkabbir ir-rendimenti tiegħek fuq 5, 10 jew 20 sena."
      }
    ],
    tierText: "Disponibbli fuq kull pjan",
    ctaLabel: "Ara d-dividendi tiegħek"
  },
  "feature-ai-analysis": {
    heading: "Analiżi tal-istokk bl-AI",
    intro: "Staqsi lill-AI tagħna dwar kwalunkwe stokk fil-portfolju tiegħek jew kwalunkwe ticker li qed tikkunsidra. Ikseb analiżi ta' kwalità istituzzjonali fi sekondi.",
    sectionLabel: "X'tista' tistaqsi:",
    features: [
      {
        title: "Analiżi tar-riżultati",
        desc: "\"Kif kienu l-aħħar riżultati ta' AAPL?\" — sommarju tar-riżultati, gwida u reazzjoni tas-suq."
      },
      {
        title: "Valutazzjoni tar-riskju",
        desc: "\"X'inhuma r-riskji li tkun taf TSLA?\" — theddidiet kompetittivi, valutazzjoni u fatturi makro."
      },
      {
        title: "Qabbel il-kompetituri",
        desc: "\"Qabbel MSFT vs GOOG\" — analiżi ġenb ma' ġenb tal-finanzji, tkabbir u valutazzjoni."
      },
      {
        title: "Reviżjoni tal-portfolju",
        desc: "\"Revja l-portfolju tiegħi\" — l-AI janalizza l-allokazzjoni, ir-riskju u jissuġġerixxi titjibiet."
      }
    ],
    tierText: "Folio: 5 sejħiet/xahar | Bifolio: 20/xahar | Trefolio: Illimitata",
    ctaLabel: "Ipprova l-analiżi AI issa"
  },
  "feature-price-alerts": {
    heading: "Twissijiet tal-prezz",
    intro: "Qatt ma titlef moviment ta' prezz importanti. Issettja prezzijiet mira u irċievi notifika l-mument li stokk jaqsam it-tarf tiegħek.",
    sectionLabel: "Kif taħdem:",
    features: [
      {
        title: "Twissijiet ta' tarf",
        desc: "Issettja miri ta' prezz \"fuq\" jew \"taħt\". Irċievi notifika meta stokk jaqsam il-linja tiegħek."
      },
      {
        title: "Twissijiet bidla fil-mija",
        desc: "Segwi bidliet fil-mija ta' kuljum jew mill-xiri. Qabad tnaqqis jew żieda kmieni."
      },
      {
        title: "Multi-kanal",
        desc: "Twissijiet email u push fuq Bifolio. Żid WhatsApp u twissijiet ta' apparat fuq Trefolio."
      },
      {
        title: "Imexxi minn cron",
        desc: "Is-sistema tagħna tiċċekkja l-prezzijiet kull minuta matul ħinijiet tas-suq. Qatt ma għandek bżonn tħares lejn l-iskrin."
      }
    ],
    tierText: "Bifolio: Sa 10 twissijiet | Trefolio: Twissijiet illimitati",
    ctaLabel: "Oħloq l-ewwel twissija"
  },
  "feature-broker-import": {
    heading: "Import tal-portfolju",
    intro: "Qed iżżid stokks manwalment wieħed wara l-ieħor? Hemm mod aktar malajr. trefolio jappoġġja tliet metodi ta' import biex tikseb il-portfolju sħiħ tiegħek fi sekondi.",
    sectionLabel: "Għażel il-metodu tiegħek:",
    features: [
      {
        title: "Sinkronizzazzjoni Broker",
        desc: "Qabbad il-broker tiegħek u nsinkronizzaw awtomatikament il-pożizzjonijiet, il-flus kontanti u transazzjonijiet tiegħek. Setup b'click wieħed, dejjem aġġornat."
      },
      {
        title: "Upload CSV",
        desc: "Esporta CSV mill-broker tiegħek u upload. Nappoġġaw 20+ formati ta' broker inklużi DEGIRO, Interactive Brokers, Trade Republic u aktar."
      },
      {
        title: "Import AI",
        desc: "Upload kwalunkwe fajl — CSV, PDF jew screenshot — u l-AI tagħna se jipparsejha fil-portfolju tiegħek. Taħdem anki ma' formati mhux tas-soltu."
      }
    ],
    tierText: "Folio: CSV u Manwali | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importa l-portfolju tiegħek"
  },
  "feature-fundamentals": {
    heading: "Fundamentali tal-kumpanija",
    intro: "Mur lil hinn mill-prezzijiet tal-istokk. trefolio jagħtik aċċess għall-finanzji sħiħa tal-kumpanija — l-istess data li jużaw l-analiżi professjonali.",
    sectionLabel: "Dak li tikseb:",
    features: [
      {
        title: "Dikjarazzjoni tad-dħul",
        desc: "Dħul, dħul net, marġini u qligħ għal kull azzjoni — kwartali u annwali."
      },
      {
        title: "Bilanċ",
        desc: "Attivi, obbligazzjonijiet, livelli ta' debitu u valur kontabbli f'daqqa t'għajn."
      },
      {
        title: "Fluss tal-flus",
        desc: "Flussi operattivi, ta' investiment u ta' finanzjament. Ara jekk il-kumpanija tiġġenerax flus reali."
      },
      {
        title: "Negozji ta' insiders",
        desc: "Ara x'jixtru u jbiegħu l-eżekuttivi u d-diretturi."
      },
      {
        title: "Possessjonijiet istituzzjonali",
        desc: "Segwi x'għandhom il-fondi kbar — Vanguard, BlackRock, Fidelity u aktar."
      }
    ],
    tierText: "Esklużiv Trefolio Pro",
    ctaLabel: "Esplora l-fundamentali"
  },
  "feature-stock-screener": {
    heading: "Filtru tal-istokk",
    intro: "Skopri stokki li jikkorrispondu mal-kriterji ta' investiment tiegħek. Iffiltra 600+ stokk f'dimensjonijiet multipli u applika strateġiji provati.",
    sectionLabel: "Iffiltra skond:",
    features: [
      {
        title: "6 dimensjonijiet ta' filtru",
        desc: "Kapitalizzazzjoni tal-mercatus, proporzjon P/E, rendiment tad-dividendi, settur, pajjiż u borża. Ikkombina kemm trid."
      },
      {
        title: "5 strateġiji integrati",
        desc: "Investiment fil-valur, tkabbir tad-dividendi, momentum, kwalità u kumpaniji żgħar — presetazzjonijiet b'klick wieħed."
      },
      {
        title: "Data rikka",
        desc: "Prezz, bidla %, kapitalizzazzjoni tal-mercatus, P/E, rendiment tad-dividendi u settur għal kull riżultat."
      },
      {
        title: "Żieda malajr",
        desc: "Sibt xi ħaġa interessanti? Żidha mal-portfolju jew lista ta' osservazzjoni direttament mir-riżultati."
      }
    ],
    tierText: "Esklużiv Trefolio Pro",
    ctaLabel: "Iftaħ il-filtru"
  },
  "feature-tax-reports": {
    heading: "Rapporti fiscali",
    intro: "Id-dikjarazzjonijiet fiscali ma għandhomx ikunu uġigħ. trefolio jiġenera rapporti fiscali speċifiċi għal kull pajjiż u jinkludi Assistent Fiskali IA għal mistoqsijietek.",
    sectionLabel: "Dak li tikseb:",
    features: [
      {
        title: "5 pajjiżi UE",
        desc: "Rapporti speċifiċi għal kull pajjiż għal Ġermanja, Franza, Spanja, l-Olanda u l-Italja."
      },
      {
        title: "Profitti u perdi",
        desc: "Profitti kapitali kkalkulati, perdi u perjodu ta' possessjoni għal kull pożizzjoni."
      },
      {
        title: "Dħul mid-dividendi",
        desc: "Dividendi grossi, taxxa ta' wiċċ u dħul net skond il-pajjiż ta' oriġini."
      },
      {
        title: "Assistent Fiskali IA",
        desc: "Staqsi mistoqsijiet bħal \"Kemm taxxa ta' wiċċ ħallast fuq dividendi Amerikani?\" u ikseb tweġibiet immedjati."
      }
    ],
    tierText: "Esklużiv Trefolio Pro",
    ctaLabel: "Ġenera r-rapport fiskali tiegħek"
  },
  "feature-portfolio-simulator": {
    heading: "Simulatur tal-portfolju",
    intro: "Ittesta l-ideat ta' investiment qabel ma tikkommetti flus reali. Is-simulatur jippermettilek tagħmel backtest, testijiet ta' stress u tesplora xenarji what-if.",
    sectionLabel: "Tliet modi:",
    features: [
      {
        title: "Backtest",
        desc: "Ara kif portfolju kien jippreżenta storikament. Qabbel ma' S&P 500, MSCI World jew benchmark personalizzat."
      },
      {
        title: "Testijiet ta' stress",
        desc: "X'jiġri jekk is-suq jinżel 30%? U x'jiġri jekk ir-rati jogħlew? Ara kif il-portfolju tiegħek jirreżisti taħt xenarji differenti."
      },
      {
        title: "Analiżi what-if",
        desc: "Żid jew neħħi pożizzjonijiet, ibdel l-allokazzjonijiet u ara l-impatt fuq ir-riskju u r-ritorn istantanjament."
      }
    ],
    tierText: "Esklużiv Trefolio Pro",
    ctaLabel: "Iftaħ is-simulatur"
  },
  "feature-net-worth": {
    heading: "Tracking tal-valur net",
    intro: "L-investimenti tiegħek huma biss parti mill-finanzji tiegħek. Segwi kollox — proprjetà, tfaddil, pensjonijiet u aktar — f'post wieħed.",
    sectionLabel: "X'tista' tsegwi:",
    features: [
      {
        title: "Proprjetà",
        desc: "Żid proprjetajiet b'valur attwali. Aġġorna meta l-kundizzjonijiet tal-mercatus jibdlu."
      },
      {
        title: "Kontijiet ta' tfaddil",
        desc: "Segwi flus kontanti fil-banek f'valuti differenti."
      },
      {
        title: "Pensjonijiet u assigurazzjoni",
        desc: "Inkludi fondi ta' pensjoni u polizzi ta' assigurazzjoni tal-ħajja fil-valur net tiegħek."
      },
      {
        title: "Valur net totali",
        desc: "Ara kollox magħqud: stokks + ETFs + crypto + proprjetà + tfaddil + pensjonijiet = stampa sħiħa tiegħek."
      }
    ],
    tierText: "Bifolio: Sa 10 assi | Trefolio: Sa 999 assi",
    ctaLabel: "Żid assi manwali"
  },
  "feature-crypto": {
    heading: "Portfolju kripto",
    intro: "Segwi kripto flimkien ma' l-istokks u ETF tiegħek. Ikseb l-istess livell ta' analiżi u għarfien għall-pożizzjonijiet kripto tiegħek.",
    sectionLabel: "Dak li tikseb:",
    features: [
      {
        title: "Dashboard kripto",
        desc: "Prezzijiet, bidliet 24h, volum u kapitalizzazzjoni tal-mercatus għat-top kriptovaluti."
      },
      {
        title: "Tracking tal-portfolju",
        desc: "Żid pożizzjonijiet kripto flimkien ma' stokks. Ara valur u allokazzjoni unifikati tal-portfolju."
      },
      {
        title: "Ċarti u storja",
        desc: "Ċarti tal-prezzijiet b'frames multipli ta' żmien u overlays ta' rata tal-kambju."
      },
      {
        title: "Analiżi kripto IA",
        desc: "Staqsi lill-IA tagħna dwar kull kripto — fundamentali, tendenzi u analiżi tal-mercatus."
      }
    ],
    tierText: "Folio: Dehra tal-mercatus | Trefolio: Tracking sħiħ tal-portfolju u IA",
    ctaLabel: "Esplora kripto"
  }
};
