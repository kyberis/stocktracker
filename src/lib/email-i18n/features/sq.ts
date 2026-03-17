import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "E mor&ecirc;t k&euml;t&euml; email nga trefolio.",
  unsubscribeLabel: "Ç'pago abonimin"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Kotizime n&euml; koh&euml; reale",
    intro: "Paneli juaj i portofolit p&euml;rdit&euml;son &ccedil;mimet drejtp&euml;rdrejt gjat&euml; gjith&euml; dit&euml;s s&euml; tregtimit — pa nevoj&euml; p&euml;r rifreskim manual.",
    sectionLabel: "&Ccedil;far&euml; merrni:",
    features: [
      {
        title: "60+ bursa",
        desc: "&Ccedil;mime nga NYSE, NASDAQ, Euronext, Londra, Frankfurt dhe m&euml; shum&euml; — powered by Yahoo Finance."
      },
      {
        title: "Auto-rifreskim",
        desc: "Kotizimet rifreskohen &ccedil;do 15 sekonda (konfigurueshme n&euml; 30s ose 60s n&euml; cil&euml;simet)."
      },
      {
        title: "Multi-monedh&euml;",
        desc: "Shikoni vlerat n&euml; monedh&euml;n tuaj lokale. Mb&euml;shtesim 21 monedha me konvertim automatik."
      }
    ],
    tierText: "E disponueshme n&euml; t&euml; gjitha planet",
    ctaLabel: "Hap panelin"
  },
  "feature-dividend-tracking": {
    heading: "Ndjekja e dividendave",
    intro: "trefolio zbulon automatikisht dividendet nga pozicionet tuaja dhe ndërton një pamje të plotë të të ardhurave.",
    sectionLabel: "Çfarë merrni:",
    features: [
      {
        title: "Kalendari i dividendave",
        desc: "Shikoni pagesat e ardhshme muaj për muaj. Dini saktësisht kur dividendet mbërrijnë në llogarinë tuaj."
      },
      {
        title: "Të ardhura vjetore",
        desc: "Të ardhura totale të parashikuara nga dividendet në të gjithë portofolin me ndarje për aksion."
      },
      {
        title: "Rendimenti mbi koston",
        desc: "Ndiqni rendimentin tuaj real bazuar në çmimin e blerjes — jo vetëm normën aktuale të dividendit."
      },
      {
        title: "Simulimi DRIP",
        desc: "Shikoni si riinvestimi i dividendave mund të rrisë kthimet tuaja gjatë 5, 10 ose 20 vjetëve."
      }
    ],
    tierText: "E disponueshme në të gjitha planet",
    ctaLabel: "Shikoni dividendet"
  },
  "feature-ai-analysis": {
    heading: "Analizë aksionesh me AI",
    intro: "Pyetni AI-n tonë për çdo aksion në portofolin tuaj ose çdo ticker që po konsideroni. Merrni analizë me cilësi institucionale në sekonda.",
    sectionLabel: "Çfarë mund të pyesni:",
    features: [
      {
        title: "Analizë rezultatesh",
        desc: "\"Si ishin rezultatet e fundit të AAPL?\" — përmbledhje rezultatesh, udhëzime dhe reaksioni i tregut."
      },
      {
        title: "Vlerësim rreziku",
        desc: "\"Cilat janë rreziqet e mbajtjes së TSLA?\" — kërcënime konkurruese, vlerësim dhe faktorë makro."
      },
      {
        title: "Krahasim konkurrentësh",
        desc: "\"Krahasoni MSFT vs GOOG\" — analizë krah për krah të financave, rritjes dhe vlerësimit."
      },
      {
        title: "Rishikim portofoli",
        desc: "\"Rishiko portofolin tim\" — AI analizon alokimin, rrezikun dhe sugjeron përmirësime."
      }
    ],
    tierText: "Folio: 5 thirrje/muaj | Bifolio: 20/muaj | Trefolio: I pakufizuar",
    ctaLabel: "Provoni analizën AI tani"
  },
  "feature-price-alerts": {
    heading: "Njoftime çmimesh",
    intro: "Kurrë mos humbni një lëvizje të rëndësishme të çmimit. Vendosni çmime objektiv dhe merrni njoftim momenti që një aksion kalon pragun tuaj.",
    sectionLabel: "Si funksionon:",
    features: [
      {
        title: "Njoftime pragu",
        desc: "Vendosni objektiva çmimi \"mbi\" ose \"nën\". Merrni njoftim kur një aksion kalon vijën tuaj."
      },
      {
        title: "Njoftime ndryshimi %",
        desc: "Ndiqni ndryshimet përqindore ditore ose nga blerja. Kapni rëniet ose rritjet herët."
      },
      {
        title: "Multi-kanal",
        desc: "Njoftime email dhe push në Bifolio. Shtoni WhatsApp dhe njoftime pajisjeje në Trefolio."
      },
      {
        title: "Të fuqizuara nga cron",
        desc: "Sistemi ynë kontrollon çmimet çdo minutë gjatë orëve të tregut. Kurrë nuk keni nevojë të shikoni ekranin."
      }
    ],
    tierText: "Bifolio: Deri në 10 njoftime | Trefolio: Njoftime të pakufizuara",
    ctaLabel: "Krijo njoftimin tënd të parë"
  },
  "feature-broker-import": {
    heading: "Import portofoli",
    intro: "Po shtoni aksione manualisht një nga një? Ka një mënyrë më të shpejtë. trefolio mbështet tre metoda importi për të marrë portofolin tuaj të plotë në sekonda.",
    sectionLabel: "Zgjidhni metodën tuaj:",
    features: [
      {
        title: "Sinkronizim me broker",
        desc: "Lidhni brokerin tuaj dhe ne sinkronizojmë automatikisht pozicionet, paratë dhe transaksionet. Konfigurim me një klik, gjithmonë e përditësuar."
      },
      {
        title: "Ngarkim CSV",
        desc: "Eksportoni një CSV nga brokeri juaj dhe ngarkojeni. Mbështesim 20+ formate broker duke përfshirë DEGIRO, Interactive Brokers, Trade Republic dhe më shumë."
      },
      {
        title: "Import AI",
        desc: "Ngarkoni çdo skedar — CSV, PDF ose screenshot — dhe AI-ja jonë do ta shndërrojë në portofolin tuaj. Funksionon edhe me formate të pazakonta."
      }
    ],
    tierText: "Folio: CSV dhe Manual | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importoni portofolin tuaj"
  },
  "feature-fundamentals": {
    heading: "Të dhënat themelore të kompanisë",
    intro: "Shkoni përtej çmimeve të aksioneve. trefolio ju jep qasje në financat e plota të kompanisë — të njëjtat të dhëna që përdorin analistët profesionalë.",
    sectionLabel: "Çfarë merrni:",
    features: [
      {
        title: "Deklarata e të ardhurave",
        desc: "Të ardhura, të ardhura neto, marzhe dhe fitim për aksion — tremujor dhe vjetor."
      },
      {
        title: "Bilanci",
        desc: "Aktivet, detyrimet, nivelet e borxhit dhe vlera kontabël me një vështrim."
      },
      {
        title: "Rrjedha e parasë",
        desc: "Rrjedhat operative, investuese dhe financiare. Shikoni nëse kompania gjeneron para të vërteta."
      },
      {
        title: "Tregtira të brendshme",
        desc: "Shikoni çfarë blejnë dhe shesin drejtuesit dhe anëtarët e bordit."
      },
      {
        title: "Pjesëmarrje institucionale",
        desc: "Ndiqni çfarë zotërojnë fondet e mëdha — Vanguard, BlackRock, Fidelity dhe më shumë."
      }
    ],
    tierText: "Ekskluzivisht Trefolio Pro",
    ctaLabel: "Eksploroni të dhënat themelore"
  },
  "feature-stock-screener": {
    heading: "Filtri i aksioneve",
    intro: "Zbuloni aksione që përputhen me kriteret tuaja të investimit. Filtroni 600+ aksione në dimensione të shumëfishta dhe aplikoni strategji të provuara.",
    sectionLabel: "Filtro sipas:",
    features: [
      {
        title: "6 dimensione filtri",
        desc: "Kapitalizimi i tregut, raporti P/E, yield-i i dividendave, sektori, vendi dhe bursa. Kombinoni sa të doni."
      },
      {
        title: "5 strategji të integruara",
        desc: "Investimi në vlerë, rritja e dividendave, momentumi, cilësia dhe kompanitë e vogla — paracaktime me një klikim."
      },
      {
        title: "Të dhëna të pasura",
        desc: "Çmimi, ndryshimi %, kapitalizimi i tregut, P/E, yield-i i dividendave dhe sektori për çdo rezultat."
      },
      {
        title: "Shtim i shpejtë",
        desc: "Gjetët diçka interesante? Shtojeni në portofolin ose listën e ndjekjes direkt nga rezultatet."
      }
    ],
    tierText: "Ekskluzivisht Trefolio Pro",
    ctaLabel: "Hapni filtrin"
  },
  "feature-tax-reports": {
    heading: "Raportet tatimore",
    intro: "Deklaratat tatimore nuk duhet të jenë të dhimbshme. trefolio gjeneron raporte tatimore specifike për vendin dhe përfshin një Asistent Tatimor IA për pyetjet tuaja.",
    sectionLabel: "Çfarë merrni:",
    features: [
      {
        title: "5 vende BE",
        desc: "Raporte specifike për vendin për Gjermaninë, Francën, Spanjën, Holandën dhe Italinë."
      },
      {
        title: "Fitimet dhe humbjet",
        desc: "Fitimet kapitalike të llogaritura, humbjet dhe periudha e mbajtjes për çdo pozicion."
      },
      {
        title: "Të ardhura nga dividentët",
        desc: "Dividentë bruto, taksa e mbajtur në burim dhe të ardhura neto sipas vendit të origjinës."
      },
      {
        title: "Asistent Tatimor IA",
        desc: "Bëni pyetje si \"Sa taksë e mbajtur në burim paga për dividentët amerikanë?\" dhe merrni përgjigje të menjëhershme."
      }
    ],
    tierText: "Ekskluzivisht Trefolio Pro",
    ctaLabel: "Gjeneroni raportin tatimor"
  },
  "feature-portfolio-simulator": {
    heading: "Simulator portofoli",
    intro: "Testoni idetë tuaja të investimit para se të angazhoni para të vërteta. Simulatori ju lejon të bëni backtest, teste stresi dhe të eksploroni skenarë what-if.",
    sectionLabel: "Tre mënyra:",
    features: [
      {
        title: "Backtest",
        desc: "Shikoni se si një portofol do të kishte performuar historikisht. Krahasoni me S&P 500, MSCI World ose një benchmark të personalizuar."
      },
      {
        title: "Testimi i stresit",
        desc: "Çfarë nëse tregu bie 30%? Po nëse normat e interesit rriten? Shikoni se si portofoli juaj reziston në skenarë të ndryshëm."
      },
      {
        title: "Analiza what-if",
        desc: "Shtoni ose hiqni pozicione, ndryshoni alokacionet dhe shikoni menjëherë ndikimin në rrezik dhe kthim."
      }
    ],
    tierText: "Ekskluzivisht Trefolio Pro",
    ctaLabel: "Hapni simulatorin"
  },
  "feature-net-worth": {
    heading: "Ndjekja e vlerës neto",
    intro: "Investimet tuaja janë vetëm një pjesë e financave tuaja. Ndiqni gjithçka — pasuri të paluajtshme, kursime, pensionet dhe më shumë — në një vend.",
    sectionLabel: "Çfarë mund të ndiqni:",
    features: [
      {
        title: "Pasuri të paluajtshme",
        desc: "Shtoni pronat me vlerë aktuale. Përditësoni kur kushtet e tregut ndryshojnë."
      },
      {
        title: "Llogaritë e kursimeve",
        desc: "Ndiqni para në banka në valuta të ndryshme."
      },
      {
        title: "Pensionet dhe sigurimet",
        desc: "Përfshini fondet e pensionit dhe polisat e sigurimit të jetës në vlerën tuaj neto."
      },
      {
        title: "Vlera totale neto",
        desc: "Shikoni gjithçka të kombinuar: aksione + ETFs + kripto + pasuri të paluajtshme + kursime + pensionet = imazhi juaj i plotë."
      }
    ],
    tierText: "Bifolio: Deri në 10 asete | Trefolio: Deri në 999 asete",
    ctaLabel: "Shtoni asete manuale"
  },
  "feature-crypto": {
    heading: "Portofoli kripto",
    intro: "Ndiqni kripto së bashku me aksionet dhe ETF-et tuaja. Merrni të njëjtin nivel analize dhe informacioni për pozicionet tuaja kripto.",
    sectionLabel: "Çfarë merrni:",
    features: [
      {
        title: "Paneli kripto",
        desc: "Çmime, ndryshime 24h, vëllim dhe kapitalizimi i tregut për kriptovalutat kryesore."
      },
      {
        title: "Ndiqja e portofolit",
        desc: "Shtoni pozicione kripto së bashku me aksionet. Shikoni vlerën dhe alokacionin e unifikuar të portofolit."
      },
      {
        title: "Grafikët dhe historia",
        desc: "Grafikët e çmimeve me korniza të shumta kohore dhe mbivendosje të normave të këmbimit."
      },
      {
        title: "Analiza kripto IA",
        desc: "Pyetni IA-në tonë për çdo kripto — bazat, trendet dhe analiza e tregut."
      }
    ],
    tierText: "Folio: Përmbledhje tregu | Trefolio: Ndiqje e plotë e portofolit dhe IA",
    ctaLabel: "Eksploroni kripto"
  }
};
