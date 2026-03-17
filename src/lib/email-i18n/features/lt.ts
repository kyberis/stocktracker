import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Gavote šį el. laišką iš trefolio.",
  unsubscribeLabel: "Atsisakyti prenumeratos"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Realiuoju laiku kotacijos",
    intro: "Jūsų portfelio skydelis atnaujina kainas tiesiogiai visą prekybos dieną — nereikia rankinio atnaujinimo.",
    sectionLabel: "Ką gaunate:",
    features: [
      {
        title: "60+ biržų",
        desc: "Kainos iš NYSE, NASDAQ, Euronext, Londono, Frankfurto ir daugiau — powered by Yahoo Finance."
      },
      {
        title: "Auto-atnaujinimas",
        desc: "Kotacijos atnaujinamos kas 15 sekundžių (konfigūruojama į 30s arba 60s nustatymuose)."
      },
      {
        title: "Keli valiutos",
        desc: "Peržiūrėkite vertes savo vietinėje valiutoje. Palaikome 21 valiutą su automatine konversija."
      }
    ],
    tierText: "Prieinama visuose planuose",
    ctaLabel: "Atidaryti skydelį"
  },
  "feature-dividend-tracking": {
    heading: "Dividendų sekimas",
    intro: "trefolio automatiškai aptinka dividendus iš jūsų pozicijų ir sukuria pilną pajamų vaizdą.",
    sectionLabel: "Ką gaunate:",
    features: [
      {
        title: "Dividendų kalendorius",
        desc: "Peržiūrėkite būsimus mokėjimus mėnesį po mėnesio. Žinokite tiksliai, kada dividendai patenka į jūsų sąskaitą."
      },
      {
        title: "Metinės pajamos",
        desc: "Bendros prognozuojamos dividendų pajamos visame portfelyje su skaidymu pagal akciją."
      },
      {
        title: "Pelnas nuo savikainos",
        desc: "Sekite savo realų pelną pagal pirkimo kainą — ne tik dabartinę dividendų normą."
      },
      {
        title: "DRIP simuliacija",
        desc: "Peržiūrėkite, kaip dividendų reinvestavimas galėtų padidinti jūsų grąžą per 5, 10 arba 20 metų."
      }
    ],
    tierText: "Prieinama visuose planuose",
    ctaLabel: "Peržiūrėti dividendus"
  },
  "feature-ai-analysis": {
    heading: "AI akcijų analizė",
    intro: "Paklauskite mūsų AI apie bet kurią akciją savo portfelyje ar bet kurį tickerį, kurį svarstote. Gaukite institucinės kokybės analizę per sekundes.",
    sectionLabel: "Ką galite paklausti:",
    features: [
      {
        title: "Rezultatų analizė",
        desc: "\"Kaip buvo paskutiniai AAPL rezultatai?\" — rezultatų, gairių ir rinkos reakcijos santrauka."
      },
      {
        title: "Rizikos vertinimas",
        desc: "\"Kokios yra TSLA laikymo rizikos?\" — konkurencinės grėsmės, vertinimas ir makro veiksniai."
      },
      {
        title: "Konkurentų palyginimas",
        desc: "\"Palygink MSFT su GOOG\" — greta finansų, augimo ir vertinimo analizė."
      },
      {
        title: "Portfelio peržiūra",
        desc: "\"Peržiūrėk mano portfelį\" — AI analizuoja alokaciją, riziką ir siūlo pagerinimus."
      }
    ],
    tierText: "Folio: 5 skambučiai/mėn. | Bifolio: 20/mėn. | Trefolio: Neribota",
    ctaLabel: "Išbandykite AI analizę dabar"
  },
  "feature-price-alerts": {
    heading: "Kainų įspėjimai",
    intro: "Niekada nepraleiskite svarbaus kainos judėjimo. Nustatykite tikslinės kainas ir gaukite pranešimą, kai akcija peržengia jūsų ribą.",
    sectionLabel: "Kaip tai veikia:",
    features: [
      {
        title: "Ribos įspėjimai",
        desc: "Nustatykite \"virš\" arba \"žemiau\" kainų tikslus. Gaukite pranešimą, kai akcija peržengia jūsų liniją."
      },
      {
        title: "Procentinio pokyčio įspėjimai",
        desc: "Stebėkite dienines arba nuo pirkimo procentinius pokyčius. Pagaukite kritimus arba pakilimus anksti."
      },
      {
        title: "Daugia kanalų",
        desc: "El. pašto ir push įspėjimai Bifolio. Pridėkite WhatsApp ir įrenginio įspėjimus Trefolio."
      },
      {
        title: "Cron varomas",
        desc: "Mūsų sistema tikrina kainas kas minutę rinkos valandomis. Niekada nereikia žiūrėti į ekraną."
      }
    ],
    tierText: "Bifolio: Iki 10 įspėjimų | Trefolio: Neriboti įspėjimai",
    ctaLabel: "Sukurti pirmą įspėjimą"
  },
  "feature-broker-import": {
    heading: "Portfelio importas",
    intro: "Rankiniu būdu pridedate akcijas vieną po vienos? Yra greitesnis būdas. trefolio palaiko tris importo metodus, kad per sekundes gautumėte pilną portfelį.",
    sectionLabel: "Pasirinkite savo metodą:",
    features: [
      {
        title: "Brokerio sinchronizacija",
        desc: "Prijunkite savo brokerį ir automatiškai sinchronizuojame jūsų pozicijas, grynųjus ir sandorius. Vieno paspaudimo nustatymas, visada atnaujinta."
      },
      {
        title: "CSV įkėlimas",
        desc: "Eksportuokite CSV iš savo brokeriaus ir įkelkite. Palaikome 20+ brokerio formatų įskaitant DEGIRO, Interactive Brokers, Trade Republic ir daugiau."
      },
      {
        title: "AI importas",
        desc: "Įkelkite bet kurį failą — CSV, PDF arba ekrano kopiją — ir mūsų AI paverš jį į jūsų portfelį. Veikia net su neįprastais formatais."
      }
    ],
    tierText: "Folio: CSV ir Rankinis | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importuoti portfelį"
  },
  "feature-fundamentals": {
    heading: "Įmonės pagrindiniai duomenys",
    intro: "Peržengkite akcijų kainas. trefolio suteikia jums prieigą prie pilnų įmonės finansų — tų pačių duomenų, kuriuos naudoja profesionalūs analitikai.",
    sectionLabel: "Ką gaunate:",
    features: [
      {
        title: "Pelno ir nuostolių ataskaita",
        desc: "Pajamos, grynasis pelnas, maržos ir pelnas vienai akcijai — ketvirtiniai ir metiniai."
      },
      {
        title: "Balansas",
        desc: "Turto, įsipareigojimų, skolų lygių ir balansinės vertės apžvalga."
      },
      {
        title: "Pinigų srautai",
        desc: "Operaciniai, investiciniai ir finansavimo srautai. Pamatykite, ar įmonė generuoja tikrus pinigus."
      },
      {
        title: "Insiderių sandoriai",
        desc: "Pamatykite, ką perka ir parduoda vadovai ir valdybos nariai."
      },
      {
        title: "Institucinės dalys",
        desc: "Sekite, ką valdo dideli fondai — Vanguard, BlackRock, Fidelity ir kt."
      }
    ],
    tierText: "Trefolio Pro išskirtinai",
    ctaLabel: "Tyrinėkite pagrindinius duomenis"
  },
  "feature-stock-screener": {
    heading: "Akcijų filtras",
    intro: "Atraskite akcijas, atitinkančias jūsų investicijų kriterijus. Filtruokite 600+ akcijų keliais matmenimis ir taikykite išbandytas strategijas.",
    sectionLabel: "Filtruoti pagal:",
    features: [
      {
        title: "6 filtro matmenys",
        desc: "Rinkos kapitalizacija, P/E santykis, dividendų pajamingumas, sektorius, šalis ir birža. Kombinuokite kiek norite."
      },
      {
        title: "5 įtaisytos strategijos",
        desc: "Vertės investavimas, dividendų augimas, impulsas, kokybė ir mažos įmonės — vieno paspaudimo nustatymai."
      },
      {
        title: "Turtingi duomenys",
        desc: "Kaina, pokytis %, rinkos kapitalizacija, P/E, dividendų pajamingumas ir sektorius kiekvienam rezultatui."
      },
      {
        title: "Greitas pridėjimas",
        desc: "Radote ką nors įdomaus? Pridėkite prie portfelio ar stebėjimo sąrašo tiesiogiai iš rezultatų."
      }
    ],
    tierText: "Trefolio Pro išskirtinai",
    ctaLabel: "Atidaryti filtrą"
  },
  "feature-tax-reports": {
    heading: "Mokesčių ataskaitos",
    intro: "Mokesčių deklaracijoms nereikia būti skausmingoms. trefolio generuoja šalims specifines mokesčių ataskaitas ir apima AI Mokesčių asistentą jūsų klausimams.",
    sectionLabel: "Ką gaunate:",
    features: [
      {
        title: "5 ES šalys",
        desc: "Šalims specifinės ataskaitos Vokietijai, Prancūzijai, Ispanijai, Nyderlandams ir Italijai."
      },
      {
        title: "Pelnai ir nuostoliai",
        desc: "Apskaičiuoti kapitalo pelnai, nuostoliai ir laikymo laikotarpis kiekvienai pozicijai."
      },
      {
        title: "Dividendų pajamos",
        desc: "Bruto dividendai, išskaičiuotas mokestis ir grynosios pajamos pagal kilmės šalį."
      },
      {
        title: "AI Mokesčių asistentas",
        desc: "Užduokite klausimus kaip \"Kiek išskaičiuoto mokesčio sumokėjau už JAV dividendus?\" ir gaukite momentines atsakymus."
      }
    ],
    tierText: "Trefolio Pro išskirtinai",
    ctaLabel: "Generuoti mokesčių ataskaitą"
  },
  "feature-portfolio-simulator": {
    heading: "Portfelio simuliatorius",
    intro: "Išbandykite savo investicijų idėjas prieš įsipareigojant tikrus pinigus. Simuliatorius leidžia atlikti backtestą, streso testus ir tyrinėti what-if scenarijus.",
    sectionLabel: "Trys režimai:",
    features: [
      {
        title: "Backtest",
        desc: "Pamatykite, kaip portfelis būtų veikęs istoriškai. Palyginkite su S&P 500, MSCI World arba pritaikytu etalonu."
      },
      {
        title: "Streso testavimas",
        desc: "Ką daryti, jei rinka nukrenta 30%? O kai palūžta palūkanos? Pamatykite, kaip jūsų portfelis atlaiko įvairius scenarijus."
      },
      {
        title: "What-if analizė",
        desc: "Pridėkite arba pašalinkite pozicijas, pakeiskite alokacijas ir iš karto pamatykite poveikį rizikai ir grąžai."
      }
    ],
    tierText: "Trefolio Pro išskirtinai",
    ctaLabel: "Atidaryti simuliatorių"
  },
  "feature-net-worth": {
    heading: "Grynųjų turtų sekimas",
    intro: "Jūsų investicijos yra tik dalis jūsų finansų. Sekite viską — nekilnojamąjį turtą, taupymus, pensijas ir daugiau — vienoje vietoje.",
    sectionLabel: "Ką galite sekti:",
    features: [
      {
        title: "Nekilnojamasis turtas",
        desc: "Pridėkite nuosavybę su dabartine verte. Atnaujinkite, kai rinkos sąlygos pasikeičia."
      },
      {
        title: "Taupymo sąskaitos",
        desc: "Sekite grynuosius pinigus bankuose skirtingomis valiutomis."
      },
      {
        title: "Pensijos ir draudimai",
        desc: "Įtraukite pensijų fondus ir gyvybės draudimo polises į savo grynąjį turtą."
      },
      {
        title: "Bendras grynasis turtas",
        desc: "Peržiūrėkite viską kartu: akcijos + ETFs + kripto + nekilnojamasis turtas + taupymai + pensijos = jūsų pilnas vaizdas."
      }
    ],
    tierText: "Bifolio: Iki 10 turto vienetų | Trefolio: Iki 999 turto vienetų",
    ctaLabel: "Pridėti rankinius turto vienetus"
  },
  "feature-crypto": {
    heading: "Kripto portfelis",
    intro: "Sekite kripto kartu su savomis akcijomis ir ETF. Gaukite tą patį analizės ir įžvalgų lygį savoms kripto pozicijoms.",
    sectionLabel: "Ką gaunate:",
    features: [
      {
        title: "Kripto skydelis",
        desc: "Kainos, 24h pokyčiai, apimtis ir rinkos kapitalizacija pagrindinėms kriptovaliutoms."
      },
      {
        title: "Portfelio sekimas",
        desc: "Pridėkite kripto pozicijas kartu su akcijomis. Peržiūrėkite vieningą portfelio vertę ir alokaciją."
      },
      {
        title: "Grafikai ir istorija",
        desc: "Kainų grafikai su keliais laiko rėmais ir valiutų kursų sluoksniais."
      },
      {
        title: "AI Kripto analizė",
        desc: "Paklauskite mūsų AI apie bet kurią kripto — pagrindai, tendencijos ir rinkos analizė."
      }
    ],
    tierText: "Folio: Rinkos apžvalga | Trefolio: Pilnas portfelio sekimas ir AI",
    ctaLabel: "Tyrinėti kripto"
  }
};
