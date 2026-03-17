import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Ai primit acest e-mail de la trefolio.",
  unsubscribeLabel: "Dezabonare"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Cotații în timp real",
    intro: "Panoul tău de portofoliu actualizează prețurile live pe tot parcursul zilei de tranzacționare — fără reîmprospătare manuală.",
    sectionLabel: "Ce primești:",
    features: [
      {
        title: "60+ burse",
        desc: "Prețuri de la NYSE, NASDAQ, Euronext, Londra, Frankfurt și altele — powered by Yahoo Finance."
      },
      {
        title: "Actualizare automată",
        desc: "Cotațiile se actualizează la fiecare 15 secunde (configurabil la 30s sau 60s în setări)."
      },
      {
        title: "Multi-valută",
        desc: "Vezi valorile în moneda ta locală. Suportăm 21 valute cu conversie automată."
      }
    ],
    tierText: "Disponibil în toate planurile",
    ctaLabel: "Deschide panoul"
  },
  "feature-dividend-tracking": {
    heading: "Urmărire dividende",
    intro: "trefolio detectează automat dividendele din pozițiile tale și construiește o imagine completă a veniturilor.",
    sectionLabel: "Ce primești:",
    features: [
      {
        title: "Calendar dividende",
        desc: "Vezi plățile viitoare lună cu lună. Știi exact când dividendele ajung în contul tău."
      },
      {
        title: "Venit anual",
        desc: "Venit total proiectat din dividende pe întregul portofoliu cu defalcare pe acțiune."
      },
      {
        title: "Randament pe cost",
        desc: "Urmărește randamentul real bazat pe prețul de cumpărare — nu doar rata actuală de dividend."
      },
      {
        title: "Simulare DRIP",
        desc: "Vezi cum reinvestirea dividendelor ar putea compune randamentele tale în 5, 10 sau 20 de ani."
      }
    ],
    tierText: "Disponibil în toate planurile",
    ctaLabel: "Vezi dividendele"
  },
  "feature-ai-analysis": {
    heading: "Analiză acțiuni cu IA",
    intro: "Întreabă IA-ul nostru despre orice acțiune din portofoliu sau orice ticker pe care îl consideri. Obține analiză de calitate instituțională în secunde.",
    sectionLabel: "Ce poți întreba:",
    features: [
      {
        title: "Analiză rezultate",
        desc: "\"Cum au fost ultimele rezultate AAPL?\" — rezumat rezultate, orientări și reacție pieței."
      },
      {
        title: "Evaluare risc",
        desc: "\"Care sunt riscurile deținerii TSLA?\" — amenințări competitive, evaluare și factori macro."
      },
      {
        title: "Comparație competitori",
        desc: "\"Compară MSFT vs GOOG\" — analiză alăturată finanțe, creștere și evaluare."
      },
      {
        title: "Revizuire portofoliu",
        desc: "\"Revizuiește-mi portofoliul\" — IA analizează alocarea, riscul și sugerează îmbunătățiri."
      }
    ],
    tierText: "Folio: 5 apeluri/lună | Bifolio: 20/lună | Trefolio: Nelimitat",
    ctaLabel: "Încearcă analiza IA acum"
  },
  "feature-price-alerts": {
    heading: "Alerte de preț",
    intro: "Nu rata niciodată o mișcare de preț importantă. Setați prețuri țintă și fiți notificat când o acțiune depășește pragul.",
    sectionLabel: "Cum funcționează:",
    features: [
      {
        title: "Alerte prag",
        desc: "Setați ținte de preț \"peste\" sau \"sub\". Fiți notificat când o acțiune depășește linia."
      },
      {
        title: "Alerte variație %",
        desc: "Urmăriți variații procentuale zilnice sau de la cumpărare. Prindeți scăderi sau creșteri devreme."
      },
      {
        title: "Multi-canal",
        desc: "Alerte email și push pe Bifolio. Adăugați WhatsApp și alerte dispozitiv pe Trefolio."
      },
      {
        title: "Alimentat de cron",
        desc: "Sistemul nostru verifică prețurile în fiecare minut în orele de piață. Nu trebuie să urmăriți ecranul."
      }
    ],
    tierText: "Bifolio: Până la 10 alerte | Trefolio: Alerte nelimitate",
    ctaLabel: "Creați prima alertă"
  },
  "feature-broker-import": {
    heading: "Import portofoliu",
    intro: "Adăugați acțiuni manual una câte una? Există o cale mai rapidă. trefolio suportă trei metode de import pentru a obține portofoliul complet în secunde.",
    sectionLabel: "Alegeți metoda:",
    features: [
      {
        title: "Sincronizare broker",
        desc: "Conectați brokerul și sincronizăm automat pozițiile, numerarul și tranzacțiile. Configurare cu un clic, mereu actualizat."
      },
      {
        title: "Încărcare CSV",
        desc: "Exportați un CSV de la broker și încărcați-l. Suportăm 20+ formate broker incluzând DEGIRO, Interactive Brokers, Trade Republic și altele."
      },
      {
        title: "Import AI",
        desc: "Încărcați orice fișier — CSV, PDF sau captură — și AI-ul nostru îl va transforma în portofoliu. Funcționează chiar și cu formate neobișnuite."
      }
    ],
    tierText: "Folio: CSV și Manual | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importați portofoliul"
  },
  "feature-fundamentals": {
    heading: "Fundamentale companie",
    intro: "Depășește prețurile acțiunilor. trefolio îți oferă acces la datele financiare complete — aceleași date pe care le folosesc analiștii profesioniști.",
    sectionLabel: "Ce primești:",
    features: [
      {
        title: "Cont de profit și pierdere",
        desc: "Venituri, profit net, marje și profit pe acțiune — trimestrial și anual."
      },
      {
        title: "Bilanț",
        desc: "Active, pasive, niveluri de datorie și valoare contabilă dintr-o privire."
      },
      {
        title: "Flux de numerar",
        desc: "Fluxuri operaționale, de investiții și financiare. Vezi dacă compania generează numerar real."
      },
      {
        title: "Tranzacții insider",
        desc: "Vezi ce cumpără și vând directorii și administratorii."
      },
      {
        title: "Dețineri instituționale",
        desc: "Urmărește ce dețin fondurile mari — Vanguard, BlackRock, Fidelity și altele."
      }
    ],
    tierText: "Exclusiv Trefolio Pro",
    ctaLabel: "Explorează fundamentalele"
  },
  "feature-stock-screener": {
    heading: "Filtru acțiuni",
    intro: "Descoperiți acțiuni care corespund criteriilor dvs. de investiție. Filtrați 600+ acțiuni pe mai multe dimensiuni și aplicați strategii dovedite.",
    sectionLabel: "Filtrează după:",
    features: [
      {
        title: "6 dimensiuni de filtru",
        desc: "Capitalizare de piață, raport P/E, randament dividende, sector, țară și bursă. Combinați câte doriți."
      },
      {
        title: "5 strategii integrate",
        desc: "Investiții în valoare, creștere dividende, momentum, calitate și small-cap — presetări cu un clic."
      },
      {
        title: "Date bogate",
        desc: "Preț, variație %, capitalizare, P/E, randament dividende și sector pentru fiecare rezultat."
      },
      {
        title: "Adăugare rapidă",
        desc: "Ați găsit ceva interesant? Adăugați-l la portofoliu sau lista de urmărire direct din rezultate."
      }
    ],
    tierText: "Exclusiv Trefolio Pro",
    ctaLabel: "Deschide filtrul"
  },
  "feature-tax-reports": {
    heading: "Rapoarte fiscale",
    intro: "Declarațiile fiscale nu trebuie să fie dureroase. trefolio generează rapoarte fiscale specifice țării și include un Asistent Fiscal IA pentru întrebările dvs.",
    sectionLabel: "Ce primești:",
    features: [
      {
        title: "5 țări UE",
        desc: "Rapoarte specifice țării pentru Germania, Franța, Spania, Olanda și Italia."
      },
      {
        title: "Câștiguri și pierderi",
        desc: "Câștiguri de capital, pierderi și perioadă de deținere calculate pentru fiecare poziție."
      },
      {
        title: "Venituri din dividende",
        desc: "Dividende brute, impozit reținut la sursă și venit net pe țara de origine."
      },
      {
        title: "Asistent Fiscal IA",
        desc: "Puneți întrebări ca \"Cât impozit pe dividende am plătit în SUA?\" și primiți răspunsuri instantanee."
      }
    ],
    tierText: "Exclusiv Trefolio Pro",
    ctaLabel: "Generați raportul fiscal"
  },
  "feature-portfolio-simulator": {
    heading: "Simulator portofoliu",
    intro: "Testați ideile de investiții înainte de a angaja bani reali. Simulatorul vă permite să faceți backtest, teste de stres și să explorați scenarii what-if.",
    sectionLabel: "Trei moduri:",
    features: [
      {
        title: "Backtest",
        desc: "Vedeți cum ar fi performat un portofoliu istoric. Comparați cu S&P 500, MSCI World sau un benchmark personalizat."
      },
      {
        title: "Teste de stres",
        desc: "Ce se întâmplă dacă piața scade cu 30%? Și dacă ratele cresc? Vedeți cum rezistă portofoliul în diferite scenarii."
      },
      {
        title: "Analiză what-if",
        desc: "Adăugați sau eliminați poziții, schimbați alocările și vedeți instant impactul asupra riscului și rentabilității."
      }
    ],
    tierText: "Exclusiv Trefolio Pro",
    ctaLabel: "Deschide simulatorul"
  },
  "feature-net-worth": {
    heading: "Urmărire avere netă",
    intro: "Investițiile tale sunt doar o parte din finanțele tale. Urmăriți totul — imobiliare, economii, pensii și mai mult — într-un singur loc.",
    sectionLabel: "Ce poți urmări:",
    features: [
      {
        title: "Imobiliare",
        desc: "Adăugați proprietăți cu valoare curentă. Actualizați când condițiile pieței se schimbă."
      },
      {
        title: "Conturi de economii",
        desc: "Urmăriți numerarul în bănci în diferite valute."
      },
      {
        title: "Pensii și asigurări",
        desc: "Includeți fonduri de pensii și polițe de asigurare de viață în averea netă."
      },
      {
        title: "Avere netă totală",
        desc: "Vedeți totul combinat: acțiuni + ETFs + cripto + imobiliare + economii + pensii = imaginea completă."
      }
    ],
    tierText: "Bifolio: Până la 10 active | Trefolio: Până la 999 active",
    ctaLabel: "Adăugați active manuale"
  },
  "feature-crypto": {
    heading: "Portofoliu crypto",
    intro: "Urmăriți crypto alături de acțiunile și ETF-urile dvs. Obțineți același nivel de analiză și insight pentru pozițiile crypto.",
    sectionLabel: "Ce primești:",
    features: [
      {
        title: "Panou crypto",
        desc: "Prețuri, variații 24h, volum și capitalizare de piață pentru principalele criptomonede."
      },
      {
        title: "Urmărire portofoliu",
        desc: "Adăugați poziții crypto alături de acțiuni. Vedeți valoarea și alocarea unificate a portofoliului."
      },
      {
        title: "Grafice și istoric",
        desc: "Grafice de prețuri cu mai multe perioade de timp și suprapuneri ale cursurilor de schimb."
      },
      {
        title: "Analiză crypto IA",
        desc: "Întrebați IA noastră despre orice crypto — fundamentale, tendințe și analiză de piață."
      }
    ],
    tierText: "Folio: Prezentare generală piață | Trefolio: Urmărire completă portofoliu și IA",
    ctaLabel: "Explorați crypto"
  }
};
