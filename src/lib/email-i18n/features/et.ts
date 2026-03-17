import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Saite selle e-kirja trefoliolt.",
  unsubscribeLabel: "Loobu tellimusest"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Reaalajas hinnad",
    intro: "Teie portfelli juhtpaneel uuendab hindu reaalajas kogu kauplemispäeva jooksul — käsitsi värskendamist pole vaja.",
    sectionLabel: "Mida saate:",
    features: [
      {
        title: "60+ börsi",
        desc: "Hinnad NYSE, NASDAQ, Euronext, London, Frankfurt ja teistelt — powered by Yahoo Finance."
      },
      {
        title: "Automaatne värskendus",
        desc: "Hinnad värskendatakse iga 15 sekundi järel (seadistatav 30s või 60s seadetes)."
      },
      {
        title: "Mitme valuuta",
        desc: "Vaadake väärtusi oma kohalikus valuutas. Toetame 21 valuutat automaatse konversiooniga."
      }
    ],
    tierText: "Saadaval kõigis plaanides",
    ctaLabel: "Avage juhtpaneel"
  },
  "feature-dividend-tracking": {
    heading: "Dividendi jälgimine",
    intro: "trefolio tuvastab automaatselt dividende teie positsioonidest ja koostab täieliku sissetuleku pildi.",
    sectionLabel: "Mida saate:",
    features: [
      {
        title: "Dividendi kalender",
        desc: "Vaadake tulevaid makseid kuu kuu haaval. Tea täpselt, millal dividendid jõuavad teie kontole."
      },
      {
        title: "Aastane sissetulek",
        desc: "Kogu prognoositav dividenditulu kogu portfellis aktsia kaupa."
      },
      {
        title: "Tootlus maksumuse pealt",
        desc: "Jälgige oma tegelikku tootlust ostuhinna põhjal — mitte ainult praegust dividendimäära."
      },
      {
        title: "DRIP simulatsioon",
        desc: "Vaadake, kuidas dividendide reinvesteerimine võiks suurendada teie tootlust 5, 10 või 20 aasta jooksul."
      }
    ],
    tierText: "Saadaval kõigis plaanides",
    ctaLabel: "Vaata dividende"
  },
  "feature-ai-analysis": {
    heading: "AI aktsiaanalüüs",
    intro: "Küsi meie AI-lt mis tahes aktsia kohta oma portfellis või mis tahes tickeri kohta, mida kaalute. Saage institutsionaalse kvaliteediga analüüs sekundite jooksul.",
    sectionLabel: "Mida saate küsida:",
    features: [
      {
        title: "Tulemuste analüüs",
        desc: "\"Kuidas olid AAPL viimased tulemused?\" — kokkuvõte tulemustest, juhistest ja turureaktsioonist."
      },
      {
        title: "Riskihindamine",
        desc: "\"Millised on TSLA omamise riskid?\" — konkurentsiohud, hindamine ja makrofaktorid."
      },
      {
        title: "Konkurendite võrdlus",
        desc: "\"Võrdle MSFT vs GOOG\" — kõrvuti analüüs rahandusest, kasvust ja hindamisest."
      },
      {
        title: "Portfelli ülevaatus",
        desc: "\"Vaata üle minu portfell\" — AI analüüsib teie allokatsiooni, riski ja soovitab parandusi."
      }
    ],
    tierText: "Folio: 5 kutsut/kuu | Bifolio: 20/kuu | Trefolio: Piiramatu",
    ctaLabel: "Proovi AI analüüsi nüüd"
  },
  "feature-price-alerts": {
    heading: "Hinnahoiatused",
    intro: "Ära kunagi jäta vahele olulist hinnamuutust. Seadke sihihinnad ja saage teavitus hetkel, kui aktsia ületab teie läve.",
    sectionLabel: "Kuidas see töötab:",
    features: [
      {
        title: "Läve hoiatused",
        desc: "Seadke \"üle\" või \"alla\" hinnasihid. Saage teavitus, kui aktsia ületab teie joone."
      },
      {
        title: "Protsendimuutuse hoiatused",
        desc: "Jälgige igapäevaseid või ostust protsendimuutusi. Püüdke langusi või tõuse varakult."
      },
      {
        title: "Mitmekanaliline",
        desc: "E-mail ja push hoiatused Bifolios. Lisage WhatsApp ja seadme hoiatused Trefolios."
      },
      {
        title: "Croniga juhitud",
        desc: "Meie süsteem kontrollib hindu iga minuti järel turu tundidel. Te ei pea kunagi ekraani vaatama."
      }
    ],
    tierText: "Bifolio: Kuni 10 hoiust | Trefolio: Piiramatud hoiatused",
    ctaLabel: "Loo esimene hoiatus"
  },
  "feature-broker-import": {
    heading: "Portfelli import",
    intro: "Lisad aktsiaid käsitsi ükshaaval? On kiirem viis. trefolio toetab kolme impordimeetodit täieliku portfelli saamiseks sekundite jooksul.",
    sectionLabel: "Valige oma meetod:",
    features: [
      {
        title: "Brokeri sünk",
        desc: "Ühendage oma broker ja sünkroniseerime automaatselt teie positsioonid, sularaha ja tehingud. Ühe klõpsuga seadistus, alati ajakohane."
      },
      {
        title: "CSV üleslaadimine",
        desc: "Eksportige CSV oma brokerilt ja laadige see üles. Toetame 20+ brokeri formaati sealhulgas DEGIRO, Interactive Brokers, Trade Republic ja teised."
      },
      {
        title: "AI import",
        desc: "Laadige üles mis tahes fail — CSV, PDF või ekraanipilt — ja meie AI teisendab selle teie portfelliks. Toimib isegi ebatavaliste formaatidega."
      }
    ],
    tierText: "Folio: CSV ja Käsitsi | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Impordi oma portfell"
  },
  "feature-fundamentals": {
    heading: "Ettevõtte põhiandmed",
    intro: "Minge aktsiahindadest kaugemale. trefolio annab teile juurdepääsu täielikele ettevõtte finantsandmetele — samadele andmetele, mida kasutavad professionaalsed analüütikud.",
    sectionLabel: "Mida saate:",
    features: [
      {
        title: "Tulemusaruanne",
        desc: "Tulu, puhastulu, marginaalid ja kasum aktsia kohta — kvartaalselt ja aastas."
      },
      {
        title: "Bilanss",
        desc: "Varad, kohustused, võlatasemed ja raamatupidamislik väärtus ühe pilguga."
      },
      {
        title: "Rahavood",
        desc: "Tegevus-, investeeringu- ja rahastamisvoogud. Vaadake, kas ettevõte genereerib tõelist sularaha."
      },
      {
        title: "Insideritehingud",
        desc: "Vaadake, mida juhid ja nõukogu liikmed ostavad ja müüvad."
      },
      {
        title: "Institutsionaalsed osalused",
        desc: "Jälgige, mida suured fondid omavad — Vanguard, BlackRock, Fidelity ja teised."
      }
    ],
    tierText: "Trefolio Pro eksklusiivne",
    ctaLabel: "Uurige põhiandmeid"
  },
  "feature-stock-screener": {
    heading: "Aktsiate filter",
    intro: "Avasta aktsiaid, mis vastavad teie investeerimiskriteeriumidele. Filtreeri 600+ aktsiat mitme mõõtme järgi ja rakenda tõestatud strateegiaid.",
    sectionLabel: "Filtreeri:",
    features: [
      {
        title: "6 filtri mõõdet",
        desc: "Turukapitalisatsioon, P/E suhe, dividenditootlus, sektor, riik ja börs. Kombineeri nii palju kui soovid."
      },
      {
        title: "5 sisse ehitatud strateegiat",
        desc: "Väärtusinvesteerimine, dividendide kasv, momentum, kvaliteet ja väikeettevõtted — ühe klõpsuga eelseaded."
      },
      {
        title: "Rikas andmestik",
        desc: "Hind, muutus %, turukapitalisatsioon, P/E, dividenditootlus ja sektor iga tulemuse kohta."
      },
      {
        title: "Kiire lisamine",
        desc: "Leidsid midagi huvitavat? Lisa see oma portfelli või jälgimisnimekirja otse tulemustest."
      }
    ],
    tierText: "Trefolio Pro eksklusiivne",
    ctaLabel: "Ava filter"
  },
  "feature-tax-reports": {
    heading: "Maksuaruanded",
    intro: "Maksudeklaratsioonid ei pea olema valusad. trefolio genereerib riigipõhiseid maksuaruandeid ja sisaldab AI Maksuassistenti teie küsimustele.",
    sectionLabel: "Mida saate:",
    features: [
      {
        title: "5 EL riiki",
        desc: "Riigipõhised aruanded Saksamaa, Prantsusmaa, Hispaania, Holland ja Itaalia kohta."
      },
      {
        title: "Kasumid ja kahjumid",
        desc: "Arvutatud kapitalikasumid, kahjumid ja omamisperiood iga positsiooni kohta."
      },
      {
        title: "Dividenditulud",
        desc: "Brutodividendid, allahindluse maks ja netotulud päritoluriigi järgi."
      },
      {
        title: "AI Maksuassistent",
        desc: "Esitage küsimusi nagu \"Kui palju allahindluse maksu maksin USA dividendidelt?\" ja saage kohesti vastuseid."
      }
    ],
    tierText: "Trefolio Pro eksklusiivne",
    ctaLabel: "Genereeri maksuaruanne"
  },
  "feature-portfolio-simulator": {
    heading: "Portfelli simulaator",
    intro: "Testige oma investeerimisideid enne tõelise raha sidumist. Simulaator võimaldab teha tagasivaatust, stressiteste ja what-if stsenaariumide uurimist.",
    sectionLabel: "Kolm režiimi:",
    features: [
      {
        title: "Tagasivaatus",
        desc: "Vaadake, kuidas portfell oleks ajalooliselt toiminud. Võrrelge S&P 500, MSCI World või kohandatud võrdlusindeksiga."
      },
      {
        title: "Stressitestid",
        desc: "Mis siis, kui turg langeb 30%? Ja tõusvate intresside korral? Vaadake, kuidas teie portfell erinevates stsenaariumites vastu peab."
      },
      {
        title: "What-if analüüs",
        desc: "Lisage või eemaldage positsioone, muutke allokatsioone ja näete kohe mõju riskile ja tootlusele."
      }
    ],
    tierText: "Trefolio Pro eksklusiivne",
    ctaLabel: "Avage simulaator"
  },
  "feature-net-worth": {
    heading: "Puhasvarade jälgimine",
    intro: "Teie investeeringud on vaid osa teie rahandusest. Jälgige kõike — kinnisvara, säästud, pensionid ja rohkem — ühes kohas.",
    sectionLabel: "Mida saate jälgida:",
    features: [
      {
        title: "Kinnisvara",
        desc: "Lisage kinnisvara praeguse väärtusega. Uuendage, kui turutingimused muutuvad."
      },
      {
        title: "Hoiukontod",
        desc: "Jälgige sularaha pankades erinevates valuutades."
      },
      {
        title: "Pensionid ja kindlustused",
        desc: "Kaasake pensionifondid ja elukindlustuspoliitikad oma puhasvarasse."
      },
      {
        title: "Kogupuhasvara",
        desc: "Vaadake kõike kombineeritult: aktsiad + ETFs + krüpto + kinnisvara + säästud + pensionid = teie täielik pilt."
      }
    ],
    tierText: "Bifolio: Kuni 10 vara | Trefolio: Kuni 999 vara",
    ctaLabel: "Lisa käsitsi varasid"
  },
  "feature-crypto": {
    heading: "Krüptoportfell",
    intro: "Jälgige krüptot koos aktsiate ja ETF-idega. Saage sama analüüsi ja teadlikkuse tase oma krüptopositsioonide jaoks.",
    sectionLabel: "Mida saate:",
    features: [
      {
        title: "Krüpto armatuurlaud",
        desc: "Hinnad, 24h muutused, maht ja turukapitalisatsioon tippkrüptovaluutade puhul."
      },
      {
        title: "Portfelli jälgimine",
        desc: "Lisage krüptopositsioone aktsiate kõrvale. Vaadake ühtlustatud portfelli väärtust ja allokatsiooni."
      },
      {
        title: "Graafikud ja ajalugu",
        desc: "Hinnagraafikud mitme ajaraamiga ja vahetuskursi kihid."
      },
      {
        title: "AI Krüpto analüüs",
        desc: "Küsige meie AI-lt mis tahes krüpto kohta — fundamentaalsed andmed, trendid ja turuanalüüs."
      }
    ],
    tierText: "Folio: Turu ülevaade | Trefolio: Täielik portfelli jälgimine ja AI",
    ctaLabel: "Uurige krüptot"
  }
};
