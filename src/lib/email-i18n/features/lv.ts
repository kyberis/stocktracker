import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Jūs saņēmāt šo e-pastu no trefolio.",
  unsubscribeLabel: "Atrakstīties"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Reāllaika kotācijas",
    intro: "Jūsu portfeļa panelis atjaunina cenas tiešraides režīmā visu tirdzniecības dienu — nav nepieciešama manuāla atjaunošana.",
    sectionLabel: "Ko iegūstat:",
    features: [
      {
        title: "60+ biržas",
        desc: "Cenas no NYSE, NASDAQ, Euronext, Londonas, Frankfurtes un citām — powered by Yahoo Finance."
      },
      {
        title: "Auto-atjaunošana",
        desc: "Kotācijas atjauninās ik 15 sekundes (konfigurējams uz 30s vai 60s iestatījumos)."
      },
      {
        title: "Vairākas valūtas",
        desc: "Skatiet vērtības savā vietējā valūtā. Atbalstām 21 valūtu ar automātisku konversiju."
      }
    ],
    tierText: "Pieejams visos plānos",
    ctaLabel: "Atvērt paneli"
  },
  "feature-dividend-tracking": {
    heading: "Dividenžu izsekošana",
    intro: "trefolio automātiski nosaka dividendes no jūsu pozīcijām un veido pilnīgu ienākumu ainu.",
    sectionLabel: "Ko iegūstat:",
    features: [
      {
        title: "Dividenžu kalendārs",
        desc: "Skatiet gaidāmās maksājumu mēnesi pa mēnesim. Ziniet precīzi, kad dividendes nonāk jūsu kontā."
      },
      {
        title: "Gada ienākumi",
        desc: "Kopējie prognozētie dividendes ienākumi visā portfelī ar sadalījumu pa akcijām."
      },
      {
        title: "Ienesīgums uz izmaksām",
        desc: "Sekojiet savam reālajam ienesīgumam, pamatojoties uz pirkuma cenu — ne tikai pašreizējo dividendes likmi."
      },
      {
        title: "DRIP simulācija",
        desc: "Skatiet, kā dividendes reinvestēšana varētu palielināt jūsu ienesīgumu 5, 10 vai 20 gadu laikā."
      }
    ],
    tierText: "Pieejams visos plānos",
    ctaLabel: "Skatīt dividendes"
  },
  "feature-ai-analysis": {
    heading: "AI akciju analīze",
    intro: "Jautājiet mūsu AI par jebkuru akciju savā portfelī vai jebkuru tickeru, ko apsverat. Iegūstiet institucionālas kvalitātes analīzi sekundēs.",
    sectionLabel: "Ko varat jautāt:",
    features: [
      {
        title: "Rezultātu analīze",
        desc: "\"Kā bija AAPL pēdējie rezultāti?\" — kopsavilkums rezultātiem, vadlīnijām un tirgus reakcijai."
      },
      {
        title: "Riska novērtējums",
        desc: "\"Kādi ir TSLA turēšanas riski?\" — konkurētspējas draudi, novērtējums un makrofaktori."
      },
      {
        title: "Konkurentu salīdzinājums",
        desc: "\"Salīdzini MSFT vs GOOG\" — blakus analīze finanšu, izaugsmes un novērtējuma."
      },
      {
        title: "Portfeļa pārskats",
        desc: "\"Pārskati manu portfeli\" — AI analizē alokāciju, risku un iesaka uzlabojumus."
      }
    ],
    tierText: "Folio: 5 zvanu/mēn. | Bifolio: 20/mēn. | Trefolio: Neierobežots",
    ctaLabel: "Izmēģiniet AI analīzi tagad"
  },
  "feature-price-alerts": {
    heading: "Cenu brīdinājumi",
    intro: "Nekad nepalaidiet garām svarīgu cenu kustību. Iestatiet mērķa cenas un saņemiet paziņojumu brīdī, kad akcija pārsniedz jūsu slieksni.",
    sectionLabel: "Kā tas darbojas:",
    features: [
      {
        title: "Sliekšņa brīdinājumi",
        desc: "Iestatiet \"virs\" vai \"zem\" cenu mērķus. Saņemiet paziņojumu, kad akcija pārsniedz jūsu līniju."
      },
      {
        title: "Procentuālās izmaiņas brīdinājumi",
        desc: "Seko līdzi dienas vai no pirkuma procentuālajām izmaiņām. Noķeriet kritumus vai pieaugumus agri."
      },
      {
        title: "Vairākkanālu",
        desc: "E-pasta un push brīdinājumi Bifolio. Pievienojiet WhatsApp un ierīces brīdinājumus Trefolio."
      },
      {
        title: "Cron darbināts",
        desc: "Mūsu sistēma pārbauda cenas katru minūti tirgus stundās. Jums nekad nav jāskatās ekrānā."
      }
    ],
    tierText: "Bifolio: Līdz 10 brīdinājumiem | Trefolio: Neierobežoti brīdinājumi",
    ctaLabel: "Izveidot pirmo brīdinājumu"
  },
  "feature-broker-import": {
    heading: "Portfeļa imports",
    intro: "Manuāli pievienojat akcijas vienu pēc otras? Ir ātrāks veids. trefolio atbalsta trīs importa metodes, lai iegūtu pilnu portfeli sekundēs.",
    sectionLabel: "Izvēlieties savu metodi:",
    features: [
      {
        title: "Brokeru sinhronizācija",
        desc: "Savienojiet savu brokeri un mēs automātiski sinhronizējam jūsu pozīcijas, naudu un darījumus. Iestatīšana ar vienu klikšķi, vienmēr aktuāla."
      },
      {
        title: "CSV augšupielāde",
        desc: "Eksportējiet CSV no sava brokera un augšupielādējiet to. Atbalstām 20+ brokeru formātus, ieskaitot DEGIRO, Interactive Brokers, Trade Republic un citus."
      },
      {
        title: "AI imports",
        desc: "Augšupielādējiet jebkuru failu — CSV, PDF vai ekrānuzņēmumu — un mūsu AI pārveidos to par jūsu portfeli. Darbojas pat ar neparastiem formātiem."
      }
    ],
    tierText: "Folio: CSV un Manuāli | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importēt portfeli"
  },
  "feature-fundamentals": {
    heading: "Uzņēmuma pamatdati",
    intro: "Pārsniedziet akciju cenas. trefolio sniedz jums piekļuvi pilnīgiem uzņēmuma finanšu datiem — tiem pašiem datiem, kurus izmanto profesionālie analītiķi.",
    sectionLabel: "Ko iegūstat:",
    features: [
      {
        title: "Peļņas un zaudējumu aprēķins",
        desc: "Ieņēmumi, tīrā peļņa, peļņas normas un peļņa par akciju — ceturksnī un gadā."
      },
      {
        title: "Bilance",
        desc: "Aktīvi, saistības, parādu līmeņi un grāmatu vērtība vienā acu uzmetienā."
      },
      {
        title: "Naudas plūsma",
        desc: "Operatīvās, investīciju un finansējuma plūsmas. Redziet, vai uzņēmums ģenerē īstu naudu."
      },
      {
        title: "Insider darījumi",
        desc: "Redziet, ko pērk un pārdod vadītāji un padomes locekļi."
      },
      {
        title: "Institucionālie īpašumtiesības",
        desc: "Sekojiet, ko īpašumā lielie fondi — Vanguard, BlackRock, Fidelity un citi."
      }
    ],
    tierText: "Trefolio Pro ekskluzīvs",
    ctaLabel: "Izpētiet pamatdatus"
  },
  "feature-stock-screener": {
    heading: "Akciju filtrs",
    intro: "Atklājiet akcijas, kas atbilst jūsu ieguldījumu kritērijiem. Filtrējiet 600+ akcijas vairākās dimensijās un izmantojiet pierādītas stratēģijas.",
    sectionLabel: "Filtrēt pēc:",
    features: [
      {
        title: "6 filtra dimensijas",
        desc: "Tirgus kapitalizācija, P/E koeficients, dividenžu ienesīgums, sektors, valsts un birža. Kombinējiet tik daudz, cik vēlaties."
      },
      {
        title: "5 iebūvētas stratēģijas",
        desc: "Vērtības ieguldījumi, dividenžu pieaugums, impulss, kvalitāte un mazi uzņēmumi — iepriekšiestatījumi ar vienu klikšķi."
      },
      {
        title: "Bagātīgi dati",
        desc: "Cena, izmaiņa %, tirgus kapitalizācija, P/E, dividenžu ienesīgums un sektors katram rezultātam."
      },
      {
        title: "Ātra pievienošana",
        desc: "Atradāt kaut ko interesantu? Pievienojiet to portfelim vai novērošanas sarakstam tieši no rezultātiem."
      }
    ],
    tierText: "Trefolio Pro ekskluzīvs",
    ctaLabel: "Atvērt filtru"
  },
  "feature-tax-reports": {
    heading: "Nodokļu ziņojumi",
    intro: "Nodokļu deklarācijām nav jābūt sāpīgām. trefolio ģenerē valstsspecifiskus nodokļu ziņojumus un ietver AI Nodokļu palīgu jūsu jautājumiem.",
    sectionLabel: "Ko iegūstat:",
    features: [
      {
        title: "5 ES valstis",
        desc: "Valstsspecifiski ziņojumi Vācijai, Francijai, Spānijai, Nīderlandei un Itālijai."
      },
      {
        title: "Peļņa un zaudējumi",
        desc: "Aprēķinātie kapitāla ieguļi, zaudējumi un turēšanas periods katrai pozīcijai."
      },
      {
        title: "Dividenžu ienākumi",
        desc: "Bruto dividendes, avota nodoklis un neto ienākumi pēc izcelsmes valsts."
      },
      {
        title: "AI Nodokļu palīgs",
        desc: "Uzdodiet jautājumus kā \"Cik daudz avota nodokļa es samaksāju par ASV dividendēm?\" un saņemiet tūlītējas atbildes."
      }
    ],
    tierText: "Trefolio Pro ekskluzīvs",
    ctaLabel: "Ģenerēt nodokļu ziņojumu"
  },
  "feature-portfolio-simulator": {
    heading: "Portfeļa simulators",
    intro: "Testējiet savas ieguldījumu idejas pirms īstu naudu iesaistīšanas. Simulators ļauj veikt backtestu, stresstestus un what-if scenāriju izpēti.",
    sectionLabel: "Trīs režīmi:",
    features: [
      {
        title: "Backtest",
        desc: "Redziet, kā portfelis būtu veicies vēsturiski. Salīdziniet ar S&P 500, MSCI World vai pielāgotu etalonu."
      },
      {
        title: "Stresstestēšana",
        desc: "Ko darīt, ja tirgus nokrīt par 30%? Un pieaugošām procentu likmēm? Redziet, kā jūsu portfelis iztur dažādus scenārijus."
      },
      {
        title: "What-if analīze",
        desc: "Pievienojiet vai noņemiet pozīcijas, mainiet alokācijas un nekavējoties redziet ietekmi uz risku un atdevi."
      }
    ],
    tierText: "Trefolio Pro ekskluzīvs",
    ctaLabel: "Atvērt simulatoru"
  },
  "feature-net-worth": {
    heading: "Neto vērtības izsekošana",
    intro: "Jūsu ieguldījumi ir tikai daļa no jūsu finansēm. Izsekojiet visu — nekustamo īpašumu, uzkrājumus, pensijas un vairāk — vienā vietā.",
    sectionLabel: "Ko varat izsekot:",
    features: [
      {
        title: "Nekustamais īpašums",
        desc: "Pievienojiet īpašumus ar pašreizējo vērtību. Atjauniniet, kad tirgus apstākļi mainās."
      },
      {
        title: "Uzkrājumu konti",
        desc: "Izsekojiet naudu bankās dažādās valūtās."
      },
      {
        title: "Pensijas un apdrošināšana",
        desc: "Iekļaujiet pensiju fondus un dzīvības apdrošināšanas polises savā neto vērtībā."
      },
      {
        title: "Kopējā neto vērtība",
        desc: "Skatiet visu kombinēti: akcijas + ETFs + kripto + nekustamais īpašums + uzkrājumi + pensijas = jūsu pilnīgs attēls."
      }
    ],
    tierText: "Bifolio: Līdz 10 aktīviem | Trefolio: Līdz 999 aktīviem",
    ctaLabel: "Pievienot manuālus aktīvus"
  },
  "feature-crypto": {
    heading: "Kripto portfelis",
    intro: "Sekojiet kripto līdzās savām akcijām un ETF. Iegūstiet tādu pašu analīzes un ieskatu līmeni savām kripto pozīcijām.",
    sectionLabel: "Ko iegūstat:",
    features: [
      {
        title: "Kripto informācijas panelis",
        desc: "Cenas, 24h izmaiņas, apjoms un tirgus kapitalizācija vadošajām kriptovalūtām."
      },
      {
        title: "Portfeļa izsekošana",
        desc: "Pievienojiet kripto pozīcijas līdzās akcijām. Skatiet vienotu portfeļa vērtību un alokāciju."
      },
      {
        title: "Grafiki un vēsture",
        desc: "Cenu grafiki ar vairākiem laika rāmjiem un valūtas kursu pārklājumiem."
      },
      {
        title: "AI Kripto analīze",
        desc: "Jautājiet mūsu AI par jebkuru kripto — pamatdati, tendences un tirgus analīze."
      }
    ],
    tierText: "Folio: Tirgus pārskats | Trefolio: Pilna portfeļa izsekošana un AI",
    ctaLabel: "Izpētiet kripto"
  }
};
