import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "To e-pošto ste prejeli od trefolio.",
  unsubscribeLabel: "Odjavi se"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Kotacije v realnem &ccaron;asu",
    intro: "Va&scaron;a nadzorna plo&scaron;ča portfelja posodablja cene v živo med celotnim trgovalnim dnem — brez ročnega osveževanja.",
    sectionLabel: "Kaj dobite:",
    features: [
      {
        title: "60+ borz",
        desc: "Cene z NYSE, NASDAQ, Euronext, London, Frankfurt in več — powered by Yahoo Finance."
      },
      {
        title: "Samodejno osveževanje",
        desc: "Kotacije se osvežujejo vsakih 15 sekund (nastavljivo na 30s ali 60s v nastavitvah)."
      },
      {
        title: "Multi-valuta",
        desc: "Oglejte si vrednosti v svoji lokalni valuti. Podpiramo 21 valut z avtomatsko pretvorbo."
      }
    ],
    tierText: "Na voljo v vseh načrtih",
    ctaLabel: "Odpri nadzorno plo&scaron;čo"
  },
  "feature-dividend-tracking": {
    heading: "Sledenje dividendam",
    intro: "trefolio samodejno zazna dividende iz va&scaron;ih pozicij in zgradi popolno sliko dohodka.",
    sectionLabel: "Kaj dobite:",
    features: [
      {
        title: "Koledar dividend",
        desc: "Oglejte si prihodnje izplačila mesec za mesecem. Vedite točno, kdaj dividende prispejo na va&scaron; račun."
      },
      {
        title: "Letni dohodek",
        desc: "Skupni predvideni dohodek od dividend v celotnem portfelju z razčlenitvijo po delnici."
      },
      {
        title: "Donos na stro&scaron;k",
        desc: "Spremljajte svoj dejanski donos na podlagi nakupne cene — ne le trenutne stopnje dividend."
      },
      {
        title: "Simulacija DRIP",
        desc: "Oglejte si, kako bi reinvestiranje dividend lahko povečalo va&scaron;e donose v 5, 10 ali 20 letih."
      }
    ],
    tierText: "Na voljo v vseh načrtih",
    ctaLabel: "Ogled dividend"
  },
  "feature-ai-analysis": {
    heading: "Analiza delnic z IA",
    intro: "Vpra&scaron;ajte na&scaron;o IA o kateri koli delnici v va&scaron;em portfelju ali katerem koli tickerju, ki ga obravnavate. Pridobite analizo institucionalne kakovosti v sekundah.",
    sectionLabel: "Kaj lahko vpra&scaron;ate:",
    features: [
      {
        title: "Analiza rezultatov",
        desc: "\"Kako so bili zadnji rezultati AAPL?\" — povzetek rezultatov, smernic in reakcije trga."
      },
      {
        title: "Ocena tveganja",
        desc: "\"Katera so tveganja posedovanja TSLA?\" — konkurenčne grožnje, vrednotenje in makro dejavniki."
      },
      {
        title: "Primerjava konkurentov",
        desc: "\"Primerjaj MSFT vs GOOG\" — analiza drug ob drug finančnih podatkov, rasti in vrednotenja."
      },
      {
        title: "Pregled portfelja",
        desc: "\"Preglej moj portfelj\" — IA analizira alokacijo, tveganje in predlaga izbolj&scaron;ave."
      }
    ],
    tierText: "Folio: 5 klicov/mes. | Bifolio: 20/mes. | Trefolio: Neomejeno",
    ctaLabel: "Preizkusite analizo IA zdaj"
  },
  "feature-price-alerts": {
    heading: "Cenovni alarmi",
    intro: "Nikoli ne zamudite pomembne cenovne premike. Nastavite ciljne cene in prejmite obvestilo, ko delnica preseže vaš prag.",
    sectionLabel: "Kako deluje:",
    features: [
      {
        title: "Pragovni alarmi",
        desc: "Nastavite cenovne cilje \"nad\" ali \"pod\". Prejmite obvestilo, ko delnica preseže vašo črto."
      },
      {
        title: "Alarmi spremembe %",
        desc: "Spremljajte dnevne ali od nakupa odstotne spremembe. Zgodaj ujamite padce ali dvige."
      },
      {
        title: "Multi-kanal",
        desc: "E-pošta in push alarmi na Bifolio. Dodajte WhatsApp in alarme naprave na Trefolio."
      },
      {
        title: "Cron poganjan",
        desc: "Naš sistem preverja cene vsako minuto med trgovalnimi urami. Nikoli vam ni treba gledati zaslona."
      }
    ],
    tierText: "Bifolio: Do 10 alarmov | Trefolio: Neomejeni alarmi",
    ctaLabel: "Ustvarite prvi alarm"
  },
  "feature-broker-import": {
    heading: "Import portfelja",
    intro: "Ročno dodajate delnice eno za eno? Obstaja hitrejši način. trefolio podpira tri metode uvoza za pridobitev celotnega portfelja v sekundah.",
    sectionLabel: "Izberite metodo:",
    features: [
      {
        title: "Broker Sync",
        desc: "Povežite brokerja in samodejno sinhroniziramo vaše pozicije, gotovino in transakcije. Nastavitev z enim klikom, vedno posodobljeno."
      },
      {
        title: "Nalaganje CSV",
        desc: "Izvozite CSV od brokera in ga naložite. Podpiramo 20+ formatov vključno z DEGIRO, Interactive Brokers, Trade Republic in več."
      },
      {
        title: "AI Import",
        desc: "Naložite katerokoli datoteko — CSV, PDF ali posnetek — in naša IA jo bo pretvorila v portfelj. Deluje tudi z neobičajnimi formati."
      }
    ],
    tierText: "Folio: CSV in Ročno | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Uvozi portfelj"
  },
  "feature-fundamentals": {
    heading: "Temeljni podatki podjetja",
    intro: "Pojdite onkraj cen delnic. trefolio vam omogoča dostop do popolnih finančnih podatkov podjetja — enakih podatkov, ki jih uporabljajo strokovni analitiki.",
    sectionLabel: "Kaj dobite:",
    features: [
      {
        title: "Izkaz poslovnega izida",
        desc: "Prihodki, čisti dobiček, marže in dobiček na delnico — četrtletno in letno."
      },
      {
        title: "Bilančna stanja",
        desc: "Sredstva, obveze, ravni dolga in knjigovodska vrednost na prvi pogled."
      },
      {
        title: "Denarni tok",
        desc: "Operativni, investicijski in finančni tokovi. Oglejte si, ali podjetje ustvarja pravi denar."
      },
      {
        title: "Insider transakcije",
        desc: "Oglejte si, kaj kupujejo in prodajajo izvršni direktorji in člani uprave."
      },
      {
        title: "Institucionalne deleže",
        desc: "Spremljajte, kaj imajo v lasti veliki skladi — Vanguard, BlackRock, Fidelity in več."
      }
    ],
    tierText: "Ekskluzivno Trefolio Pro",
    ctaLabel: "Raziščite temelje"
  },
  "feature-stock-screener": {
    heading: "Filter delnic",
    intro: "Odkrijte delnice, ki ustrezajo va&scaron;im nalo&zdot;benim kriterijem. Filtrirajte 600+ delnic v ve&ccaron; dimenzijah in uporabite preizku&scaron;ene strategije.",
    sectionLabel: "Filtriraj po:",
    features: [
      {
        title: "6 dimenzij filtra",
        desc: "Tr&zdot;na kapitalizacija, razmerje P/E, donos dividend, sektor, dr&zdot;ava in borza. Kombinirajte toliko, kolikor &zdot;elite."
      },
      {
        title: "5 vgrajenih strategij",
        desc: "Nalo&zdot;ba v vrednost, rast dividend, zagon, kakovost in majhne dru&zdot;be — prednastavitve z enim klikom."
      },
      {
        title: "Bogati podatki",
        desc: "Cena, sprememba %, tr&zdot;na kapitalizacija, P/E, donos dividend in sektor za vsak rezultat."
      },
      {
        title: "Hitro dodajanje",
        desc: "Na&scaron;li ste kaj zanimivega? Dodajte v portfelj ali seznam spremljanja neposredno iz rezultatov."
      }
    ],
    tierText: "Ekskluzivno Trefolio Pro",
    ctaLabel: "Odpri filter"
  },
  "feature-tax-reports": {
    heading: "Davčna poročila",
    intro: "Davčne napovedi ne morajo biti boleče. trefolio ustvarja poročila, specifična za državo, in vključuje davčnega asistenta IA za vaša vprašanja.",
    sectionLabel: "Kaj dobite:",
    features: [
      {
        title: "5 držav EU",
        desc: "Poročila, specifična za državo, za Nemčijo, Francijo, Španijo, Nizozemsko in Italijo."
      },
      {
        title: "Dobički in izgube",
        desc: "Izračunani kapitalski dobički, izgube in obdobje posedovanja za vsako pozicijo."
      },
      {
        title: "Dohodek od dividend",
        desc: "Bruto dividende, odtegnjeni davek in čisti dohodek po državi izvora."
      },
      {
        title: "Davčni asistent IA",
        desc: "Postavite vprašanja kot \"Koliko odtegnjenega davka sem plačal na ameriške dividende?\" in prejmite takojšnje odgovore."
      }
    ],
    tierText: "Ekskluzivno Trefolio Pro",
    ctaLabel: "Ustvari davčno poročilo"
  },
  "feature-portfolio-simulator": {
    heading: "Simulator portfelja",
    intro: "Preizkusite svoje naložbene ideje pred zavezanjem resničnega denarja. Simulator omogoča backtest, stresne teste in raziskovanje what-if scenarijev.",
    sectionLabel: "Tri načini:",
    features: [
      {
        title: "Backtest",
        desc: "Oglejte si, kako bi se portfelj zgodovinsko obnašal. Primerjajte s S&P 500, MSCI World ali prilagojenim merilom."
      },
      {
        title: "Stresno testiranje",
        desc: "Kaj če trg pade za 30%? Kaj pa naraščajoče obrestne mere? Oglejte si, kako vaš portfelj zdrži v različnih scenarijih."
      },
      {
        title: "What-if analiza",
        desc: "Dodajte ali odstranite pozicije, spremenite alokacije in takoj vidite vpliv na tveganje in donos."
      }
    ],
    tierText: "Ekskluzivno Trefolio Pro",
    ctaLabel: "Odpri simulator"
  },
  "feature-net-worth": {
    heading: "Sledenje neto vrednosti",
    intro: "Vaše naložbe so le del vaših financ. Sledite vse — nepremičnine, prihranke, pokojnine in več — na enem mestu.",
    sectionLabel: "Kaj lahko sledite:",
    features: [
      {
        title: "Nepremičnine",
        desc: "Dodajte nepremičnine s trenutno vrednostjo. Posodobite, ko se tržni pogoji spremenijo."
      },
      {
        title: "Varčevalni računi",
        desc: "Sledite gotovini v bankah v različnih valutah."
      },
      {
        title: "Pokojnine in zavarovanja",
        desc: "Vključite pokojninske sklade in življenjske zavarovalne police v svojo neto vrednost."
      },
      {
        title: "Skupna neto vrednost",
        desc: "Oglejte si vse skupaj: delnice + ETFs + krypto + nepremičnine + prihranki + pokojnine = vaša popolna slika."
      }
    ],
    tierText: "Bifolio: Do 10 sredstev | Trefolio: Do 999 sredstev",
    ctaLabel: "Dodaj ročna sredstva"
  },
  "feature-crypto": {
    heading: "Krypto portfelj",
    intro: "Sledite krypto skupaj z delnicami in ETF-i. Pridobite enako raven analize in vpogledov za vaše krypto pozicije.",
    sectionLabel: "Kaj dobite:",
    features: [
      {
        title: "Krypto nadzorna plošča",
        desc: "Cene, 24h spremembe, obseg in tržna kapitalizacija vodilnih kriptovalut."
      },
      {
        title: "Sledenje portfelja",
        desc: "Dodajte krypto pozicije skupaj z delnicami. Oglejte si poenoteno vrednost in alokacijo portfelja."
      },
      {
        title: "Grafi in zgodovina",
        desc: "Cenovni grafi z več časovnimi okviri in prekrivanjem tečajev."
      },
      {
        title: "IA Krypto analiza",
        desc: "Vprašajte našo IA o kateri koli kripto — temelji, trendi in tržna analiza."
      }
    ],
    tierText: "Folio: Pregled trga | Trefolio: Polno sledenje portfelja in IA",
    ctaLabel: "Raziščite krypto"
  }
};
