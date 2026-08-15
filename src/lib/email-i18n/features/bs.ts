import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Primili ste ovaj e-mail od trefolio.",
  unsubscribeLabel: "Odjavi se"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Kotacije u stvarnom vremenu",
    intro: "Va&scaron;a nadzorna ploča portfelja ažurira cijene uživo tijekom cijelog trgovačkog dana — bez ručnog osvježavanja.",
    sectionLabel: "Što dobivate:",
    features: [
      {
        title: "60+ burzi",
        desc: "Cijene s NYSE, NASDAQ, Euronext, London, Frankfurt i više — powered by Yahoo Finance."
      },
      {
        title: "Auto-osvježavanje",
        desc: "Kotacije se osvježavaju svakih 15 sekundi (konfigurabilno na 30s ili 60s u postavkama)."
      },
      {
        title: "Multi-valuta",
        desc: "Pogledajte vrijednosti u svojoj lokalnoj valuti. Podržavamo 21 valutu s automatskom konverzijom."
      }
    ],
    tierText: "",
    ctaLabel: "Otvori nadzornu ploču"
  },
  "feature-dividend-tracking": {
    heading: "Praćenje dividendi",
    intro: "trefolio automatski otkriva dividende iz vaših pozicija i gradi potpunu sliku prihoda.",
    sectionLabel: "Što dobivate:",
    features: [
      {
        title: "Kalendar dividendi",
        desc: "Pogledajte nadolazeće isplate mjesec po mjesec. Znajte točno kada dividende stignu na vaš račun."
      },
      {
        title: "Godišnji prihod",
        desc: "Ukupni projicirani prihod od dividendi na cijelom portfelju s rasporedom po dionici."
      },
      {
        title: "Prinos na trošak",
        desc: "Pratite svoj stvarni prinos na temelju cijene kupnje — ne samo trenutnu stopu dividendi."
      },
      {
        title: "DRIP simulacija",
        desc: "Pogledajte kako reinvestiranje dividendi može povećati vaše prinose tijekom 5, 10 ili 20 godina."
      }
    ],
    tierText: "",
    ctaLabel: "Pogledaj dividende"
  },
  "feature-ai-analysis": {
    heading: "AI analiza dionica",
    intro: "Pitajte našu AI o bilo kojoj dionici u portfelju ili bilo kojem tickeru koji razmatrate. Dobijte institucionalnu kvalitetu analize u sekundama.",
    sectionLabel: "Što možete pitati:",
    features: [
      {
        title: "Analiza rezultata",
        desc: "\"Kako su bili posljednji rezultati AAPL?\" — sažetak rezultata, smjernica i reakcija tržišta."
      },
      {
        title: "Procjena rizika",
        desc: "\"Koji su rizici držanja TSLA?\" — konkurentske prijetnje, vrednovanje i makro čimbenici."
      },
      {
        title: "Usporedba konkurenata",
        desc: "\"Usporedi MSFT vs GOOG\" — usporedna analiza financija, rasta i vrednovanja."
      },
      {
        title: "Pregled portfelja",
        desc: "\"Pregledaj moj portfelj\" — AI analizira alokaciju, rizik i predlaže poboljšanja."
      }
    ],
    tierText: "",
    ctaLabel: "Isprobaj AI analizu sada"
  },
  "feature-price-alerts": {
    heading: "Alarmi za cijene",
    intro: "Nikada ne propustite važan pokret cijene. Postavite ciljne cijene i primite obavijest kada dionica prijeđe vaš prag.",
    sectionLabel: "Kako radi:",
    features: [
      {
        title: "Alarmi praga",
        desc: "Postavite ciljeve cijena \"iznad\" ili \"ispod\". Primite obavijest kada dionica prijeđe vašu liniju."
      },
      {
        title: "Alarmi promjene %",
        desc: "Pratite dnevne ili od kupnje postotne promjene. Uhvatite padove ili rast rano."
      },
      {
        title: "Multi-kanal",
        desc: "E-mail i push alarmi na trefolio. Dodajte WhatsApp i alarme uređaja na trefolio."
      },
      {
        title: "Cron pogonjen",
        desc: "Naš sustav provjerava cijene svake minute tijekom radnog vremena tržišta. Nikada ne morate gledati ekran."
      }
    ],
    tierText: "",
    ctaLabel: "Stvorite prvi alarm"
  },
  "feature-broker-import": {
    heading: "Import portfelja",
    intro: "Ručno dodajete dionice jednu po jednu? Postoji brži način. trefolio podržava tri metode uvoza za dobivanje cijelog portfelja u sekundama.",
    sectionLabel: "Odaberite metodu:",
    features: [
      {
        title: "Broker Sync",
        desc: "Povežite brokera i automatski sinkroniziramo vaše pozicije, gotovinu i transakcije. Postavka jednim klikom, uvijek ažurirano."
      },
      {
        title: "Učitavanje CSV",
        desc: "Izvezite CSV od brokera i učitajte ga. Podržavamo 20+ formata uključujući DEGIRO, Interactive Brokers, Trade Republic i više."
      },
      {
        title: "AI Import",
        desc: "Učitajte bilo koju datoteku — CSV, PDF ili snimku — i naša AI će je pretvoriti u portfelj. Radi čak i s neobičnim formatima."
      }
    ],
    tierText: "",
    ctaLabel: "Importirajte portfelj"
  },
  "feature-fundamentals": {
    heading: "Temeljni podaci tvrtke",
    intro: "Idite dalje od cijena dionica. trefolio vam daje pristup potpunim financijama tvrtke — istim podacima koje koriste profesionalni analitičari.",
    sectionLabel: "Što dobivate:",
    features: [
      {
        title: "Račun dobiti i gubitka",
        desc: "Prihodi, neto dobit, marže i dobit po dionici — tromjesečno i godišnje."
      },
      {
        title: "Bilanca",
        desc: "Imovina, obveze, razine duga i knjigovodstvena vrijednost na prvi pogled."
      },
      {
        title: "Novčani tok",
        desc: "Operativni, investicijski i financijski tokovi. Vidite generira li tvrtka stvarni novac."
      },
      {
        title: "Insider transakcije",
        desc: "Vidite što direktori i članovi uprave kupuju i prodaju."
      },
      {
        title: "Institucionalni udjeli",
        desc: "Pratite što posjeduju veliki fondovi — Vanguard, BlackRock, Fidelity i više."
      }
    ],
    tierText: "",
    ctaLabel: "Istražite temeljce"
  },
  "feature-stock-screener": {
    heading: "Filtar dionica",
    intro: "Otkrijte dionice koje odgovaraju vašim kriterijima ulaganja. Filtrirajte 600+ dionica u više dimenzija i primijenite dokazane strategije.",
    sectionLabel: "Filtriraj po:",
    features: [
      {
        title: "6 dimenzija filtra",
        desc: "Tržišna kapitalizacija, omjer P/E, prinos dividendi, sektor, država i burza. Kombinirajte koliko god želite."
      },
      {
        title: "5 ugrađenih strategija",
        desc: "Ulaganje u vrijednost, rast dividendi, zamah, kvaliteta i male tvrtke — prednastavbe jednim klikom."
      },
      {
        title: "Bogati podaci",
        desc: "Cijena, promjena %, tržišna kapitalizacija, P/E, prinos dividendi i sektor za svaki rezultat."
      },
      {
        title: "Brzo dodavanje",
        desc: "Pronašli ste nešto zanimljivo? Dodajte u portfelj ili listu praćenja izravno iz rezultata."
      }
    ],
    tierText: "",
    ctaLabel: "Otvori filtar"
  },
  "feature-tax-reports": {
    heading: "Porezni izvještaji",
    intro: "Porezne prijave ne moraju biti bolne. trefolio generira izvještaje specifične za državu i uključuje poreznog asistenta IA za vaša pitanja.",
    sectionLabel: "Što dobivate:",
    features: [
      {
        title: "5 zemalja EU",
        desc: "Izvještaji specifični za državu za Njemačku, Francusku, Španjolsku, Nizozemsku i Italiju."
      },
      {
        title: "Dobici i gubici",
        desc: "Izračunati kapitalni dobici, gubici i razdoblje držanja za svaku poziciju."
      },
      {
        title: "Prihod od dividendi",
        desc: "Bruto dividend, porez po odbitku i neto prihod prema zemlji podrijetla."
      },
      {
        title: "Porezni asistent IA",
        desc: "Postavite pitanja poput \"Koliko sam poreza po odbitku platio na američke dividende?\" i dobijte trenutne odgovore."
      }
    ],
    tierText: "",
    ctaLabel: "Generiraj porezni izvještaj"
  },
  "feature-portfolio-simulator": {
    heading: "Simulator portfelja",
    intro: "Testirajte svoje investicijske ideje prije ulaganja pravog novca. Simulator omogućuje backtest, stres testove i istraživanje what-if scenarija.",
    sectionLabel: "Tri načina:",
    features: [
      {
        title: "Backtest",
        desc: "Vidite kako bi se portfelj povijesno ponašao. Usporedite sa S&P 500, MSCI World ili prilagođenim benchmarkom."
      },
      {
        title: "Stres testiranje",
        desc: "Što ako tržište padne 30%? A što ako kamatne stope rastu? Vidite kako vaš portfelj izdržava u različitim scenarijima."
      },
      {
        title: "What-if analiza",
        desc: "Dodajte ili uklonite pozicije, promijenite alokacije i odmah vidite utjecaj na rizik i povrat."
      }
    ],
    tierText: "",
    ctaLabel: "Otvori simulator"
  },
  "feature-net-worth": {
    heading: "Praćenje neto vrijednosti",
    intro: "Vaše investicije su samo dio vaših financija. Pratite sve — nekretnine, štednju, mirovine i više — na jednom mjestu.",
    sectionLabel: "Što možete pratiti:",
    features: [
      {
        title: "Nekretnine",
        desc: "Dodajte nekretnine s trenutnom vrijednošću. Ažurirajte kada se tržišni uvjeti promijene."
      },
      {
        title: "Štedni računi",
        desc: "Pratite gotovinu u bankama u različitim valutama."
      },
      {
        title: "Mirovine i osiguranja",
        desc: "Uključite mirovinske fondove i police osiguranja života u svoju neto vrijednost."
      },
      {
        title: "Ukupna neto vrijednost",
        desc: "Vidite sve kombinirano: dionice + ETFs + krypto + nekretnine + štednja + mirovine = vaša potpuna slika."
      }
    ],
    tierText: "",
    ctaLabel: "Dodaj ručnu imovinu"
  },
  "feature-crypto": {
    heading: "Krypto portfelj",
    intro: "Pratite krypto uz svoje dionice i ETF-ove. Dobijte istu razinu analize i uvida za svoje krypto pozicije.",
    sectionLabel: "Što dobivate:",
    features: [
      {
        title: "Krypto nadzorna ploča",
        desc: "Cijene, 24h promjene, volumen i tržišna kapitalizacija vodećih kriptovaluta."
      },
      {
        title: "Praćenje portfelja",
        desc: "Dodajte krypto pozicije uz dionice. Vidite objedinjenu vrijednost i alokaciju portfelja."
      },
      {
        title: "Grafovi i povijest",
        desc: "Grafovi cijena s više vremenskih okvira i slojevima tečaja."
      },
      {
        title: "IA Krypto analiza",
        desc: "Pitajte našu IA o bilo kojoj kripto — fundamentali, trendovi i tržišna analiza."
      }
    ],
    tierText: "",
    ctaLabel: "Istražite krypto"
  }
};
