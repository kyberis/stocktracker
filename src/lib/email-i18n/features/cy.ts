import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Cawsoch yr e-bost hwn gan trefolio.",
  unsubscribeLabel: "Dad-danysgrifio"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Dyfynbrisau amser real",
    intro: "Mae eich bwrdd portffolio yn diweddaru prisiau'n fyw drwy gydol y diwrnod masnachu — dim angen adnewyddu â llaw.",
    sectionLabel: "Beth rydych chi'n ei gael:",
    features: [
      { title: "60+ cyfnewidfeydd", desc: "Prisiau o NYSE, NASDAQ, Euronext, Llundain, Frankfurt a mwy — powered by Yahoo Finance." },
      { title: "Hunan-adnewyddu", desc: "Mae'r dyfynbrisau'n adnewyddu bob 15 eiliad (gellir ei ffurfweddu i 30s neu 60s yn eich gosodiadau)." },
      { title: "Amldalennau", desc: "Gweld gwerthoedd yn eich arian cyfred lleol. Rydym yn cefnogi 21 arian cyfred gyda throsiad awtomatig." }
    ],
    tierText: "Ar gael ar bob cynllun",
    ctaLabel: "Agorwch eich bwrdd"
  },
  "feature-dividend-tracking": {
    heading: "Trafoddy Dividendau",
    intro: "Mae trefolio'n canfod dividendau'n awtomatig o'ch meddiannau ac yn adeiladu darlun cyflawn o incwm.",
    sectionLabel: "Beth rydych chi'n ei gael:",
    features: [
      { title: "Calendr dividendau", desc: "Gweld taliadau sydd ar ddod fis ar ôl fis. Gwybod yn union pryd mae'r dividendau'n cyrraedd eich cyfrif." },
      { title: "Incwm blynyddol", desc: "Incwm dividendau arfaethedig cyfanswm ar draws eich portffolio cyfan gyda thoriad i lawr fesul stoc." },
      { title: "Enillion ar gost", desc: "Trafodwch eich enillion gwirioneddol yn seiliedig ar bris prynu — nid dim ond y gyfradd dividendau bresennol." },
      { title: "Simiwleiddio DRIP", desc: "Gweld sut gall ail-fuddsoddi dividendau gynyddu eich enillion dros 5, 10 neu 20 mlynedd." }
    ],
    tierText: "Ar gael ar bob cynllun",
    ctaLabel: "Gweld eich dividendau"
  },
  "feature-ai-analysis": {
    heading: "Dadansoddi stociau gydag AI",
    intro: "Gofynnwch i'n AI am unrhyw stoc yn eich portffolio neu unrhyw ticker rydych chi'n ei ystyried. Cael dadansoddiad o ansawdd sefydliadol mewn eiliadau.",
    sectionLabel: "Beth allwch chi ofyn:",
    features: [
      { title: "Dadansoddiad canlyniadau", desc: "\"Sut oedd canlyniadau diwethaf AAPL?\" — crynodeb o ganlyniadau, arweiniad ac ymateb y farchnad." },
      { title: "Asesiad risg", desc: "\"Beth yw'r risgiau o ddal TSLA?\" — bygythiadau cystadleuol, gwerthusiad a ffactorau macro." },
      { title: "Cymhariaeth cystadleuwyr", desc: "\"Cymharwch MSFT vs GOOG\" — dadansoddiad ochr wrth ochr o gyllid, twf a gwerthusiad." },
      { title: "Adolygiad portffolio", desc: "\"Adolygwch fy mhortffolio\" — mae'r AI yn dadansoddi eich dyrannu, risg ac yn awgrymu gwelliannau." }
    ],
    tierText: "Folio: 5 galwadau/mis | Bifolio: 20/mis | Trefolio: Diderfyn",
    ctaLabel: "Rhoi cynnig ar ddadansoddiad AI nawr"
  },
  "feature-price-alerts": {
    heading: "Rhybuddion pris",
    intro: "Peidiwch byth â cholli symudiad pris pwysig. Gosodwch brisiau targed a chael hysbysiad y foment y mae stoc yn croesi eich trothwy.",
    sectionLabel: "Sut mae'n gweithio:",
    features: [
      { title: "Rhybuddion trothwy", desc: "Gosodwch dargedau pris \"uchod\" neu \"isod\". Cael hysbysiad pan fydd stoc yn croesi eich llinell." },
      { title: "Rhybuddion newid %", desc: "Dilyn newidiadau canran dyddiol neu o bryniant. Dal cwympiadau neu godiadau'n gynnar." },
      { title: "Aml-sianel", desc: "Rhybuddion e-bost a push ar Bifolio. Ychwanegwch WhatsApp a rhybuddion dyfais ar Trefolio." },
      { title: "Cron bwer", desc: "Mae ein system yn gwirio prisiau bob munud yn ystod oriau'r farchnad. Does dim angen i chi edrych ar y sgrin byth." }
    ],
    tierText: "Bifolio: Hyd at 10 rhybuddion | Trefolio: Rhybuddion diderfyn",
    ctaLabel: "Creu eich rhybudd cyntaf"
  },
  "feature-broker-import": {
    heading: "Mewnforio portffolio",
    intro: "Yn ychwanegu stociau â llaw un ar ôl y llall? Mae ffordd gyflymach. Mae trefolio yn cefnogi tair dull mewnforio i gael eich portffolio llawn mewn eiliadau.",
    sectionLabel: "Dewiswch eich dull:",
    features: [
      { title: "Sync Broker", desc: "Cysylltwch eich brocer a byddwn yn cydweddu eich meddiannau, arian parod a thrafodion yn awtomatig. Gosod un clic, bob amser yn gyfredol." },
      { title: "Llwytho CSV", desc: "Allforiwch CSV o'ch brocer a llwythwch ef. Rydym yn cefnogi 20+ fformat gan gynnwys DEGIRO, Interactive Brokers, Trade Republic a mwy." },
      { title: "Mewnforio AI", desc: "Llwythwch unrhyw ffeil — CSV, PDF neu screenshot — a bydd ein AI yn ei drawsnewid i'ch portffolio. Gweithio hyd yn oed gyda fformatiau anarferol." }
    ],
    tierText: "Folio: CSV a Llaw | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Mewnforio eich portffolio"
  },
  "feature-fundamentals": {
    heading: "Sylfaenol cwmni",
    intro: "Ewch y tu hwnt i brisiau stoc. Mae trefolio yn rhoi mynediad i chi i gyfrifon ariannol cwmni cyflawn — yr un data y mae dadansoddwyr proffesiynol yn ei ddefnyddio.",
    sectionLabel: "Beth rydych chi'n ei gael:",
    features: [
      { title: "Datganiad incwm", desc: "Refeniw, incwm net, ymylau ac enillion fesul cyfranddaliad — chwarterol a blynyddol." },
      { title: "Cydbwysedd", desc: "Asedau, rhwymedigaethau, lefelau dyled a gwerth llyfr ar yr olwg gyntaf." },
      { title: "Llif arian", desc: "Llifau gweithredol, buddsoddi a chyllid. Gweld a yw'r cwmni'n cynhyrchu arian go iawn." },
      { title: "Trafodion mewnol", desc: "Gweld beth mae gweithredwyr a chyfarwyddwyr yn prynu a gwerthu." },
      { title: "Daliadau sefydliadol", desc: "Dilynwch beth sydd gan y cronfeydd mawr — Vanguard, BlackRock, Fidelity a mwy." }
    ],
    tierText: "Ar wahân i Trefolio Pro",
    ctaLabel: "Archwilio sylfaenol"
  },
  "feature-stock-screener": {
    heading: "Hidlydd stociau",
    intro: "Darganfyddwch stociau sy'n cyfateb i'ch meini prawf buddsoddi. Hidliwch 600+ o stociau ar draws sawl dimensiwn a chymhwyswch strategaethau profedig.",
    sectionLabel: "Hidlo yn ôl:",
    features: [
      { title: "6 dimensiynau hidlydd", desc: "Cyfalaf marchnad, cymhareb P/E, cynnyrch cyfranddaliadau, sector, gwlad a masnachfa. Cyfuniwch gymaint ag y dymunwch." },
      { title: "5 strategaethau mewnol", desc: "Buddsoddi mewn gwerth, twf cyfranddaliadau, momentwm, ansawdd a chwmniau bach — gosodiadau un clic." },
      { title: "Data cyfoethog", desc: "Pris, newid %, cyfalaf marchnad, P/E, cynnyrch cyfranddaliadau a sector ar gyfer pob canlyniad." },
      { title: "Ychwanegu'n gyflym", desc: "Wedi dod o hyd i rywbeth diddorol? Ychwanegwch at eich portffolio neu restr wylio yn uniongyrchol o'r canlyniadau." }
    ],
    tierText: "Ar wahân i Trefolio Pro",
    ctaLabel: "Agorwch yr hidlydd"
  },
  "feature-tax-reports": {
    heading: "Adroddiadau treth",
    intro: "Nid oes rhaid i ddatganiadau treth fod yn boenus. Mae trefolio yn cynhyrchu adroddiadau treth sy'n benodol i wlad ac yn cynnwys Cynorthwyydd Treth IA ar gyfer eich cwestiynau.",
    sectionLabel: "Beth rydych chi'n ei gael:",
    features: [
      { title: "5 gwlad yr UE", desc: "Adroddiadau sy'n benodol i wlad ar gyfer yr Almaen, Ffrainc, Sbaen, yr Iseldiroedd a'r Eidal." },
      { title: "Enillion a cholledion", desc: "Enillion cyfalaf a gyfrifwyd, colledion a chyfnod dal ar gyfer pob sefyllfa." },
      { title: "Incwm o gyfranddaliadau", desc: "Cyfranddaliadau gros, treth wrth y ffynhonnell ac incwm net yn ôl gwlad tarddiad." },
      { title: "Cynorthwyydd Treth IA", desc: "Gofynnwch gwestiynau fel \"Faint o dreth wrth y ffynhonnell talais ar gyfranddaliadau America?\" a chael atebion ar unwaith." }
    ],
    tierText: "Ar wahân i Trefolio Pro",
    ctaLabel: "Cynhyrchu eich adroddiad treth"
  },
  "feature-portfolio-simulator": {
    heading: "Symudydd portffolio",
    intro: "Profwch eich syniadau buddsoddi cyn ymrwymo arian go iawn. Mae'r symudydd yn eich galluogi i wneud backtest, profion straen ac archwilio senarios what-if.",
    sectionLabel: "Tair modd:",
    features: [
      { title: "Backtest", desc: "Gweld sut y byddai portffolio wedi perfformio'n hanesyddol. Cymharwch â S&P 500, MSCI World neu farchnod personol." },
      { title: "Profion straen", desc: "Beth os yw'r farchnad yn cwympo 30%? Beth am gyfraddau sy'n codi? Gweld sut mae eich portffolio'n dal i fyny o dan wahanol senarios." },
      { title: "Dadansoddiad what-if", desc: "Ychwanegwch neu ddilewch sefyllfaoedd, newidiwch dyrannau a gweld yr effaith ar risg a ffurflen ar unwaith." }
    ],
    tierText: "Ar wahân i Trefolio Pro",
    ctaLabel: "Agorwch y symudydd"
  },
  "feature-net-worth": {
    heading: "Trafod gwerth net",
    intro: "Mae eich buddsoddiadau yn unig yn rhan o'ch cyfrifon. Dilynwch bopeth — eiddo, cynilion, pensiynau a mwy — mewn un lle.",
    sectionLabel: "Beth allwch chi ei ddilyn:",
    features: [
      { title: "Eiddo", desc: "Ychwanegwch eiddo gyda gwerth cyfredol. Diweddarwch pan fydd amodau'r farchnad yn newid." },
      { title: "Cyfrifon cynilo", desc: "Dilynwch arian parod mewn banciau ar draws gwahanol arian cyfred." },
      { title: "Pensiynau ac yswiriant", desc: "Cynnwys cronfeydd pensiwn a polisïau yswiriant bywyd yn eich gwerth net." },
      { title: "Gwerth net cyfanswm", desc: "Gweld popeth gyda'i gilydd: stociau + ETFs + crypto + eiddo + cynilion + pensiynau = eich darlun cyflawn." }
    ],
    tierText: "Bifolio: Hyd at 10 asedau | Trefolio: Hyd at 999 asedau",
    ctaLabel: "Ychwanegu asedau llaw"
  },
  "feature-crypto": {
    heading: "Portffolio crypto",
    intro: "Dilynwch crypto ochr yn ochr â'ch stociau a'ch ETFau. Cael yr un lefel o ddadansoddiad a mewnwelediadau ar gyfer eich safleoedd crypto.",
    sectionLabel: "Beth rydych chi'n ei gael:",
    features: [
      { title: "Bwrdd crypto", desc: "Prisiau, newidiadau 24h, cyfaint a chyfalaf marchnad ar gyfer prif cryptocuron." },
      { title: "Trafod portffolio", desc: "Ychwanegwch safleoedd crypto ochr yn ochr â stociau. Gweld gwerth ac alocasiwn unedig y portffolio." },
      { title: "Siapiau a hanes", desc: "Siapiau prisiau gyda sawl ffrâm amser a throsiadau cyfradd cyfnewid." },
      { title: "Dadansoddiad crypto IA", desc: "Gofynnwch i'n IA am unrhyw crypto — sylfaenolion, tueddiadau a dadansoddiad marchnad." }
    ],
    tierText: "Folio: Trosolwg marchnad | Trefolio: Trafod portffolio llawn ac IA",
    ctaLabel: "Archwilio crypto"
  }
};
