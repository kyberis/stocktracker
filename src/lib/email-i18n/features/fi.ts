import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Sait t&auml;m&auml;n s&auml;hk&ouml;postin trefoliolta.",
  unsubscribeLabel: "Lopeta tilaus"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Reaaliaikaiset kurssit",
    intro: "Salkkusi hallintapaneeli p&auml;ivitt&auml;&auml; hinnat liven koko kaupank&auml;yntip&auml;iv&auml;n ajan — manuaalista p&auml;ivityst&auml; ei tarvita.",
    sectionLabel: "Mitä saat:",
    features: [
      { title: "60+ p&ouml;rssej&auml;", desc: "Hinnat NYSE, NASDAQ, Euronext, Lontoo, Frankfurt ja muilta — powered by Yahoo Finance." },
      { title: "Automaattinen p&auml;ivitys", desc: "Kurssit p&auml;ivittyv&auml;t 15 sekunnin v&auml;lein (asetettavissa 30s tai 60s asetuksissa)." },
      { title: "Monivaluutta", desc: "N&auml;e arvot paikallisessa valuutassasi. Tuemme 21 valuuttaa automaattisella muunnoksella." }
    ],
    tierText: "Saatavilla kaikissa hinnoittelupaketeissa",
    ctaLabel: "Avaa hallintapaneeli"
  },
  "feature-dividend-tracking": {
    heading: "Dividendien seuranta",
    intro: "trefolio tunnistaa automaattisesti dividendit salkuistasi ja rakentaa t&auml;ydellisen tulokuvan.",
    sectionLabel: "Mitä saat:",
    features: [
      { title: "Dividendikalenteri", desc: "N&auml;e tulevat maksut kuukausi kerrallaan. Tied&auml; tarkalleen milloin dividendit saapuvat tilillesi." },
      { title: "Vuositulot", desc: "Kokonaisprojisoitu dividenditulo koko salkustasi osakekohtaisella jakaumalla." },
      { title: "Tuotto kustannuksille", desc: "Seuraa todellista tuottoasi ostohinnan perusteella — ei vain nykyist&auml; dividenditasoa." },
      { title: "DRIP-simulaatio", desc: "N&auml;e miten dividendien uudelleensijoittaminen voisi kasvattaa tuottojasi 5, 10 tai 20 vuodessa." }
    ],
    tierText: "Saatavilla kaikissa hinnoittelupaketeissa",
    ctaLabel: "N&auml;yt&auml; dividendit"
  },
  "feature-ai-analysis": {
    heading: "AI-osakeanalyysi",
    intro: "Kysy AI:ltämme mitä tahansa salkussasi olevaa osaketta tai mitä tahansa harkitsemaasi tickeriä. Saat institutionaalisen laatuisen analyysin sekunneissa.",
    sectionLabel: "Mitä voit kysyä:",
    features: [
      { title: "Tulosanalyysi", desc: "\"Miten AAPL:n viimeiset tulokset olivat?\" — yhteenveto tuloksista, ohjeista ja markkinareaktiosta." },
      { title: "Riskinarviointi", desc: "\"Mitä riskejä TSLA:n omistamisessa on?\" — kilpailuuhkat, arvostus ja makrotekijät." },
      { title: "Kilpailijavertailu", desc: "\"Vertaa MSFT vs GOOG\" — rinnakkainen analyysi taloudesta, kasvusta ja arvostuksesta." },
      { title: "Salkun arviointi", desc: "\"Arvioi salkkuni\" — AI analysoi allokaation, riskin ja ehdottaa parannuksia." }
    ],
    tierText: "Folio: 5 kutsua/kk | Bifolio: 20/kk | Trefolio: Rajaton",
    ctaLabel: "Kokeile AI-analyysiä nyt"
  },
  "feature-price-alerts": {
    heading: "Hinnoitteluhälyt",
    intro: "Älä koskaan missaa tärkeää hintaliikettä. Aseta tavoitehinnat ja saa ilmoitus heti kun osake ylittää kynnysarvosi.",
    sectionLabel: "Miten se toimii:",
    features: [
      { title: "Kynnyshälyt", desc: "Aseta \"ylä\" tai \"ala\" hintatavoitteet. Saa ilmoitus kun osake ylittää linjasi." },
      { title: "Prosenttimuutos hälyt", desc: "Seuraa päivittäisiä tai ostosta prosenttimuutoksia. Nappaa laskut tai nousut varhain." },
      { title: "Monikanavainen", desc: "Sähköposti- ja push-hälyt Bifoliossa. Lisää WhatsApp ja laitehälyt Trefoliossa." },
      { title: "Cron-ajettu", desc: "Järjestelmämme tarkistaa hinnat minuutin välein markkina-aikoina. Sinun ei koskaan tarvitse katsella näyttöä." }
    ],
    tierText: "Bifolio: Jopa 10 hälytystä | Trefolio: Rajattomat hälytykset",
    ctaLabel: "Luo ensimmäinen hälytys"
  },
  "feature-broker-import": {
    heading: "Salkun tuonti",
    intro: "Lisäätkö osakkeita manuaalisesti yksi kerrallaan? On nopeampi tapa. trefolio tukee kolmea tuontimenetelmää koko salkun saamiseksi sekunneissa.",
    sectionLabel: "Valitse menetelmäsi:",
    features: [
      { title: "Broker-synkronointi", desc: "Yhdistä välittäjäsi ja synkronisoimme automaattisesti positiosi, käteisesi ja tapahtumat. Yhden napsautuksen asennus, aina ajan tasalla." },
      { title: "CSV-lataus", desc: "Vie CSV välittäjältäsi ja lataa se. Tuemme 20+ välittäjäformaattia mukaan lukien DEGIRO, Interactive Brokers, Trade Republic ja muut." },
      { title: "AI-tuonti", desc: "Lataa mikä tahansa tiedosto — CSV, PDF tai kuvakaappaus — ja AI-mme muuntaa sen salkuksesi. Toimii jopa epätavallisilla formaateilla." }
    ],
    tierText: "Folio: CSV ja Manuaalinen | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Tuo salkkusi"
  },
  "feature-fundamentals": {
    heading: "Yrityksen perustiedot",
    intro: "Mene osakekursseja pidemmälle. trefolio antaa sinulle pääsyn yrityksen täydellisiin taloustietoihin — samoihin tietoihin kuin ammattianalyytikot käyttävät.",
    sectionLabel: "Mitä saat:",
    features: [
      { title: "Tuloslaskelma", desc: "Liikevaihto, nettovoitto, marginaalit ja osakekohtainen tulos — neljännesvuosittain ja vuosittain." },
      { title: "Tase", desc: "Vastaa, velat, velkatasot ja kirjanpitoarvo yhdellä silmäyksellä." },
      { title: "Kassavirta", desc: "Liiketoiminta-, sijoitus- ja rahoitusvirrat. Katso tuottaako yritys oikeaa käteistä." },
      { title: "Insider-kaupat", desc: "Katso mitä johtajat ja hallituksen jäsenet ostavat ja myyvät." },
      { title: "Laitosomistukset", desc: "Seuraa mitä suuret rahastot omistavat — Vanguard, BlackRock, Fidelity ja muut." }
    ],
    tierText: "Trefolio Pro eksklusiivinen",
    ctaLabel: "Tutustu perustietoihin"
  },
  "feature-stock-screener": {
    heading: "Osake suodatin",
    intro: "L&ouml;yd&auml; osakkeita jotka vastaavat sijoituskriteerej&auml;si. Suodata 600+ osaketta useilla ulottuvuuksilla ja k&auml;yt&auml; kokeiltuja strategioita.",
    sectionLabel: "Suodata:",
    features: [
      { title: "6 suodatin ulottuvuutta", desc: "Markkina-arvo, P/E-suhde, osinkotuotto, toimiala, maa ja p&ouml;rssi. Yhdist&auml; niin monta kuin haluat." },
      { title: "5 valmiita strategioita", desc: "Arvosijoittaminen, osinkojen kasvu, momentum, laatu ja pienet yhti&ouml;t — yhden napsautuksen esiasetukset." },
      { title: "Rikas data", desc: "Hinta, muutos %, markkina-arvo, P/E, osinkotuotto ja toimiala jokaiselle tulokselle." },
      { title: "Pika lis&auml;ys", desc: "L&ouml;ysit jotain mielenkiintoista? Lis&auml;&auml; se salkkuun tai seurantalistaan suoraan tuloksista." }
    ],
    tierText: "Trefolio Pro eksklusiivinen",
    ctaLabel: "Avaa suodatin"
  },
  "feature-tax-reports": {
    heading: "Veroraportit",
    intro: "Veroilmoitukset eiv&auml;t tarvitse olla tuskallisia. trefolio tuottaa maakohtaisia veroraportteja ja sis&auml;lt&auml;&auml; AI Veroneuvojan kysymyksiisi.",
    sectionLabel: "Mitä saat:",
    features: [
      { title: "5 EU-maata", desc: "Maakohtaiset raportit Saksalle, Ranskalle, Espanjalle, Alankomille ja It&auml;lle." },
      { title: "Voitot ja tappiot", desc: "Lasketut p&auml;&auml;omat voitot, tappiot ja omistusjakso jokaiselle positiolle." },
      { title: "Osinkotulot", desc: "Brutto-osingot, l&auml;hdevero ja nettotuotot alkuper&auml;maan mukaan." },
      { title: "AI Veroneuvoja", desc: "Kysy kysymyksi&auml; kuten \"Kuinka paljon l&auml;hdeveroa maksoin yhdysvaltalaisista osingoista?\" ja saa v&auml;litt&ouml;m&auml;t vastaukset." }
    ],
    tierText: "Trefolio Pro eksklusiivinen",
    ctaLabel: "Luo veroraportti"
  },
  "feature-portfolio-simulator": {
    heading: "Salkun simulointi",
    intro: "Testaa sijoitusideoitasi ennen oikean rahan sitomista. Simulaattori mahdollistaa backtestin, stressitestin ja what-if-skenaarioiden tutkimisen.",
    sectionLabel: "Kolme tilaa:",
    features: [
      { title: "Backtest", desc: "Katso miten salkku olisi menestynyt historiallisesti. Vertaa S&P 500, MSCI World tai mukautettuun vertailuindeksiin." },
      { title: "Stressitestaus", desc: "Mitä jos markkinat putoavat 30%? Entä nousevat korot? Katso miten salkkusi kestää eri skenaarioissa." },
      { title: "What-if-analyysi", desc: "Lisää tai poista positioita, muuta allokaatioita ja näe välittömästi vaikutus riskiin ja tuottoon." }
    ],
    tierText: "Trefolio Pro eksklusiivinen",
    ctaLabel: "Avaa simulointi"
  },
  "feature-net-worth": {
    heading: "Varallisuuden seuranta",
    intro: "Sijoituksesi ovat vain osa talouttasi. Seuraa kaikkea — kiinteistöt, säästöt, eläkkeet ja enemmän — yhdessä paikassa.",
    sectionLabel: "Mitä voit seurata:",
    features: [
      { title: "Kiinteistöt", desc: "Lisää kiinteistöjä nykyisellä arvolla. Päivitä kun markkinaolot muuttuvat." },
      { title: "Säästötilit", desc: "Seuraa käteistä pankeissa eri valuutoissa." },
      { title: "Eläkkeet ja vakuutukset", desc: "Sisällytä eläkerahastot ja henkivakuutukset varallisuuteesi." },
      { title: "Kokonaisvarallisuus", desc: "Näe kaikki yhdistettynä: osakkeet + ETFs + krypto + kiinteistöt + säästöt + eläkkeet = täydellinen kuva." }
    ],
    tierText: "Bifolio: Enintään 10 omaisuutta | Trefolio: Enintään 999 omaisuutta",
    ctaLabel: "Lisää manuaalisia omaisuuseriä"
  },
  "feature-crypto": {
    heading: "Kryptosalkku",
    intro: "Seuraa kryptoa osakkeidesi ja ETF:iesi rinnalla. Saa sama analyysi- ja oivallustaso kryptopositioillesi.",
    sectionLabel: "Mitä saat:",
    features: [
      { title: "Krypto-koontinäyttö", desc: "Hinnat, 24h muutokset, volyymi ja markkina-arvo huippukryptovaluutoille." },
      { title: "Salkun seuranta", desc: "Lisää kryptopositioita osakkeiden rinnalle. Näe yhdenmukainen salkun arvo ja allokaatio." },
      { title: "Kaaviot ja historia", desc: "Hintakaaviot useilla aikaväleillä ja valuuttakurssien päällekkäisyyksillä." },
      { title: "AI Krypto-analyysi", desc: "Kysy AI:ltamme mitä tahansa kryptosta — perustiedot, trendit ja markkina-analyysi." }
    ],
    tierText: "Folio: Markkinayleiskatsaus | Trefolio: Täysi salkun seuranta ja AI",
    ctaLabel: "Tutustu kryptoon"
  }
};