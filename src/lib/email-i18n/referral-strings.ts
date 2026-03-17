/**
 * Localized strings for the referral program email template.
 * Keyed by locale code. EN/ES are in the DB; these cover all other European locales.
 */
import type { ReferralProgramStrings, TemplateFooterStrings } from "./template-types";

export const referralStrings: Record<string, { referral: ReferralProgramStrings; footer: TemplateFooterStrings }> = {
  fr: {
    footer: { receivedText: "Vous avez re&ccedil;u cet e-mail de trefolio.", unsubscribeLabel: "Se d&eacute;sabonner" },
    referral: {
      heading: "Partagez trefolio, gagnez du temps Pro gratuit",
      intro: "Vous aimez trefolio&nbsp;? Partagez-le avec vos amis et gagnez <strong>30 jours de Pro</strong> pour chaque ami qui s&rsquo;inscrit et v&eacute;rifie son compte.",
      howItWorks: "<strong>Comment &ccedil;a marche&nbsp;:</strong>",
      steps: [
        { title: "Partagez votre lien personnel", desc: "Envoyez votre lien de parrainage unique &agrave; vos amis, votre famille ou votre communaut&eacute; d&rsquo;investisseurs." },
        { title: "Ils s&rsquo;inscrivent et v&eacute;rifient", desc: "Votre ami cr&eacute;e un compte trefolio avec votre lien et v&eacute;rifie son e-mail. C&rsquo;est tout &mdash; aucun achat requis." },
        { title: "Vous gagnez 30 jours de Pro", desc: "Une fois v&eacute;rifi&eacute;, vous recevez automatiquement 30 jours de Trefolio Pro. Cumulez jusqu&rsquo;&agrave; 365 jours&nbsp;!" },
      ],
      referralLinkLabel: "Votre lien de parrainage",
      referralLinkHint: "Partagez ce lien avec vos amis pour commencer &agrave; gagner",
      ctaLabel: "Partager votre lien",
      tipText: "&#x1F4A1; <strong>Astuce :</strong> Partagez sur WhatsApp, Telegram ou X pour une port&eacute;e maximale. Plus d&rsquo;amis rejoignent, plus vous gagnez de temps Pro gratuit&nbsp;!",
    },
  },
  de: {
    footer: { receivedText: "Sie haben diese E-Mail von trefolio erhalten.", unsubscribeLabel: "Abbestellen" },
    referral: {
      heading: "Teilen Sie trefolio, verdienen Sie kostenlose Pro-Zeit",
      intro: "Lieben Sie trefolio? Teilen Sie es mit Freunden und verdienen Sie <strong>30 Tage Pro</strong> f&uuml;r jeden Freund, der sich anmeldet und sein Konto best&auml;tigt.",
      howItWorks: "<strong>So funktioniert&rsquo;s:</strong>",
      steps: [
        { title: "Teilen Sie Ihren pers&ouml;nlichen Link", desc: "Senden Sie Ihren einzigartigen Empfehlungslink an Freunde, Familie oder Ihre Investoren-Community." },
        { title: "Sie registrieren sich und best&auml;tigen", desc: "Ihr Freund erstellt ein trefolio-Konto &uuml;ber Ihren Link und best&auml;tigt seine E-Mail. Das ist alles &mdash; kein Kauf erforderlich." },
        { title: "Sie verdienen 30 Tage Pro", desc: "Nach der Best&auml;tigung erhalten Sie automatisch 30 Tage Trefolio Pro. Sammeln Sie bis zu 365 Tage!" },
      ],
      referralLinkLabel: "Ihr Empfehlungslink",
      referralLinkHint: "Teilen Sie diesen Link mit Freunden, um loszulegen",
      ctaLabel: "Ihren Link teilen",
      tipText: "&#x1F4A1; <strong>Profi-Tipp:</strong> Teilen Sie auf WhatsApp, Telegram oder X f&uuml;r maximale Reichweite. Je mehr Freunde beitreten, desto mehr kostenlose Pro-Zeit verdienen Sie!",
    },
  },
  it: {
    footer: { receivedText: "Hai ricevuto questa email da trefolio.", unsubscribeLabel: "Annulla iscrizione" },
    referral: {
      heading: "Condividi trefolio, guadagna tempo Pro gratuito",
      intro: "Ami trefolio? Condividilo con gli amici e guadagna <strong>30 giorni di Pro</strong> per ogni amico che si iscrive e verifica il proprio account.",
      howItWorks: "<strong>Come funziona:</strong>",
      steps: [
        { title: "Condividi il tuo link personale", desc: "Invia il tuo link di referral unico ad amici, familiari o alla tua comunit&agrave; di investitori." },
        { title: "Si iscrivono e verificano", desc: "Il tuo amico crea un account trefolio con il tuo link e verifica la sua email. Tutto qui &mdash; nessun acquisto richiesto." },
        { title: "Guadagni 30 giorni di Pro", desc: "Una volta verificato, ricevi automaticamente 30 giorni di Trefolio Pro. Accumula fino a 365 giorni!" },
      ],
      referralLinkLabel: "Il tuo link di referral",
      referralLinkHint: "Condividi questo link con gli amici per iniziare a guadagnare",
      ctaLabel: "Condividi il tuo link",
      tipText: "&#x1F4A1; <strong>Suggerimento:</strong> Condividi su WhatsApp, Telegram o X per la massima portata. Pi&ugrave; amici si uniscono, pi&ugrave; tempo Pro gratuito guadagni!",
    },
  },
  pt: {
    footer: { receivedText: "Recebeu este email do trefolio.", unsubscribeLabel: "Cancelar subscri&ccedil;&atilde;o" },
    referral: {
      heading: "Partilhe trefolio, ganhe tempo Pro gr&aacute;tis",
      intro: "Adora o trefolio? Partilhe-o com amigos e ganhe <strong>30 dias de Pro</strong> por cada amigo que se registe e verifique a sua conta.",
      howItWorks: "<strong>Como funciona:</strong>",
      steps: [
        { title: "Partilhe o seu link pessoal", desc: "Envie o seu link de refer&ecirc;ncia &uacute;nico a amigos, fam&iacute;lia ou &agrave; sua comunidade de investidores." },
        { title: "Eles registam-se e verificam", desc: "O seu amigo cria uma conta trefolio com o seu link e verifica o email. &Eacute; tudo &mdash; sem necessidade de compra." },
        { title: "Ganha 30 dias de Pro", desc: "Quando verificam, recebe automaticamente 30 dias de Trefolio Pro. Acumule at&eacute; 365 dias!" },
      ],
      referralLinkLabel: "O seu link de refer&ecirc;ncia",
      referralLinkHint: "Partilhe este link com amigos para come&ccedil;ar a ganhar",
      ctaLabel: "Partilhar o seu link",
      tipText: "&#x1F4A1; <strong>Dica:</strong> Partilhe no WhatsApp, Telegram ou X para m&aacute;ximo alcance. Quantos mais amigos aderirem, mais tempo Pro gr&aacute;tis ganha!",
    },
  },
  nl: {
    footer: { receivedText: "U heeft deze e-mail ontvangen van trefolio.", unsubscribeLabel: "Uitschrijven" },
    referral: {
      heading: "Deel trefolio, verdien gratis Pro-tijd",
      intro: "Houdt u van trefolio? Deel het met vrienden en verdien <strong>30 dagen Pro</strong> voor elke vriend die zich aanmeldt en zijn account verifieert.",
      howItWorks: "<strong>Zo werkt het:</strong>",
      steps: [
        { title: "Deel uw persoonlijke link", desc: "Stuur uw unieke verwijzingslink naar vrienden, familie of uw beleggerscommunity." },
        { title: "Ze melden zich aan en verifi&euml;ren", desc: "Uw vriend maakt een trefolio-account aan via uw link en verifieert zijn e-mail. Dat is alles &mdash; geen aankoop vereist." },
        { title: "U verdient 30 dagen Pro", desc: "Na verificatie ontvangt u automatisch 30 dagen Trefolio Pro. Spaar tot 365 dagen!" },
      ],
      referralLinkLabel: "Uw verwijzingslink",
      referralLinkHint: "Deel deze link met vrienden om te beginnen met verdienen",
      ctaLabel: "Deel uw link",
      tipText: "&#x1F4A1; <strong>Tip:</strong> Deel op WhatsApp, Telegram of X voor maximaal bereik. Hoe meer vrienden meedoen, hoe meer gratis Pro-tijd u verdient!",
    },
  },
  pl: {
    footer: { receivedText: "Otrzyma&#322;e&#347; ten e-mail od trefolio.", unsubscribeLabel: "Wypisz si&#281;" },
    referral: {
      heading: "Podziel si&#281; trefolio, zdobądź darmowy czas Pro",
      intro: "Kochasz trefolio? Podziel si&#281; ze znajomymi i zdobądź <strong>30 dni Pro</strong> za ka&#380;dego znajomego, kt&oacute;ry si&#281; zarejestruje i zweryfikuje konto.",
      howItWorks: "<strong>Jak to dzia&#322;a:</strong>",
      steps: [
        { title: "Podziel si&#281; swoim linkiem", desc: "Wy&#347;lij sw&oacute;j unikalny link polecaj&#261;cy do znajomych, rodziny lub spo&#322;eczno&#347;ci inwestor&oacute;w." },
        { title: "Rejestruj&#261; si&#281; i weryfikuj&#261;", desc: "Tw&oacute;j znajomy tworzy konto trefolio u&#380;ywaj&#261;c Twojego linku i weryfikuje email. To wszystko &mdash; bez zakupu." },
        { title: "Zdobywasz 30 dni Pro", desc: "Po weryfikacji automatycznie otrzymujesz 30 dni Trefolio Pro. Zbieraj do 365 dni!" },
      ],
      referralLinkLabel: "Tw&oacute;j link polecaj&#261;cy",
      referralLinkHint: "Podziel si&#281; tym linkiem ze znajomymi, aby zacz&#261;&#263; zarabia&#263;",
      ctaLabel: "Udost&#281;pnij sw&oacute;j link",
      tipText: "&#x1F4A1; <strong>Wskaz&oacute;wka:</strong> Udost&#281;pnij na WhatsApp, Telegram lub X dla maksymalnego zasi&#281;gu. Im wi&#281;cej znajomych do&#322;&#261;czy, tym wi&#281;cej darmowego czasu Pro zdobywasz!",
    },
  },
  sv: {
    footer: { receivedText: "Du fick detta e-postmeddelande fr&aring;n trefolio.", unsubscribeLabel: "Avprenumerera" },
    referral: {
      heading: "Dela trefolio, tj&auml;na gratis Pro-tid",
      intro: "&Auml;lskar du trefolio? Dela med v&auml;nner och tj&auml;na <strong>30 dagar Pro</strong> f&ouml;r varje v&auml;n som registrerar sig och verifierar sitt konto.",
      howItWorks: "<strong>S&aring; fungerar det:</strong>",
      steps: [
        { title: "Dela din personliga l&auml;nk", desc: "Skicka din unika v&auml;rvningsl&auml;nk till v&auml;nner, familj eller din investerarcommunity." },
        { title: "De registrerar sig och verifierar", desc: "Din v&auml;n skapar ett trefolio-konto via din l&auml;nk och verifierar sin e-post. Det &auml;r allt &mdash; inget k&ouml;p kr&auml;vs." },
        { title: "Du tj&auml;nar 30 dagar Pro", desc: "Efter verifiering f&aring;r du automatiskt 30 dagar Trefolio Pro. Samla upp till 365 dagar!" },
      ],
      referralLinkLabel: "Din v&auml;rvningsl&auml;nk",
      referralLinkHint: "Dela denna l&auml;nk med v&auml;nner f&ouml;r att b&ouml;rja tj&auml;na",
      ctaLabel: "Dela din l&auml;nk",
      tipText: "&#x1F4A1; <strong>Tips:</strong> Dela p&aring; WhatsApp, Telegram eller X f&ouml;r maximal r&auml;ckvidd. Ju fler v&auml;nner som g&aring;r med, desto mer gratis Pro-tid tj&auml;nar du!",
    },
  },
  da: {
    footer: { receivedText: "Du har modtaget denne e-mail fra trefolio.", unsubscribeLabel: "Afmeld" },
    referral: {
      heading: "Del trefolio, tjen gratis Pro-tid",
      intro: "Elsker du trefolio? Del det med venner og tjen <strong>30 dages Pro</strong> for hver ven, der tilmelder sig og verificerer sin konto.",
      howItWorks: "<strong>S&aring;dan fungerer det:</strong>",
      steps: [
        { title: "Del dit personlige link", desc: "Send dit unikke henvisningslink til venner, familie eller dit investormilj&oslash;." },
        { title: "De tilmelder sig og verificerer", desc: "Din ven opretter en trefolio-konto via dit link og verificerer sin e-mail. Det er alt &mdash; intet k&oslash;b kr&aelig;ves." },
        { title: "Du tjener 30 dages Pro", desc: "Efter verifikation f&aring;r du automatisk 30 dages Trefolio Pro. Saml op til 365 dage!" },
      ],
      referralLinkLabel: "Dit henvisningslink",
      referralLinkHint: "Del dette link med venner for at begynde at tjene",
      ctaLabel: "Del dit link",
      tipText: "&#x1F4A1; <strong>Tip:</strong> Del p&aring; WhatsApp, Telegram eller X for maksimal r&aelig;kkevidde. Jo flere venner, der tilslutter sig, jo mere gratis Pro-tid tjener du!",
    },
  },
  fi: {
    footer: { receivedText: "Sait t&auml;m&auml;n s&auml;hk&ouml;postin trefoliolta.", unsubscribeLabel: "Peru tilaus" },
    referral: {
      heading: "Jaa trefolio, ansaitse ilmaista Pro-aikaa",
      intro: "Rakastatko trefoliota? Jaa se yst&auml;ville ja ansaitse <strong>30 p&auml;iv&auml;&auml; Pro-aikaa</strong> jokaisesta yst&auml;v&auml;st&auml;, joka rekister&ouml;ityy ja vahvistaa tilins&auml;.",
      howItWorks: "<strong>N&auml;in se toimii:</strong>",
      steps: [
        { title: "Jaa henkil&ouml;kohtainen linkkisi", desc: "L&auml;het&auml; ainutlaatuinen suosittelulinkkisi yst&auml;ville, perheelle tai sijoittajayhteis&ouml;llesi." },
        { title: "He rekister&ouml;ityv&auml;t ja vahvistavat", desc: "Yst&auml;v&auml;si luo trefolio-tilin linkkisi kautta ja vahvistaa s&auml;hk&ouml;postinsa. Siinä kaikki &mdash; ei ostopakkoa." },
        { title: "Ansaitset 30 p&auml;iv&auml;&auml; Pro-aikaa", desc: "Vahvistuksen j&auml;lkeen saat automaattisesti 30 p&auml;iv&auml;&auml; Trefolio Pro -aikaa. Ker&auml;&auml; jopa 365 p&auml;iv&auml;&auml;!" },
      ],
      referralLinkLabel: "Suosittelulinkkisi",
      referralLinkHint: "Jaa t&auml;m&auml; linkki yst&auml;ville ansaitaksesi",
      ctaLabel: "Jaa linkkisi",
      tipText: "&#x1F4A1; <strong>Vinkki:</strong> Jaa WhatsAppissa, Telegramissa tai X:ss&auml; maksimaaliseen tavoittavuuteen. Mit&auml; enemm&auml;n yst&auml;vi&auml; liittyy, sit&auml; enemm&auml;n ilmaista Pro-aikaa ansaitset!",
    },
  },
  nb: {
    footer: { receivedText: "Du mottok denne e-posten fra trefolio.", unsubscribeLabel: "Avslutt abonnement" },
    referral: {
      heading: "Del trefolio, tjen gratis Pro-tid",
      intro: "Elsker du trefolio? Del det med venner og tjen <strong>30 dager Pro</strong> for hver venn som registrerer seg og verifiserer kontoen sin.",
      howItWorks: "<strong>Slik fungerer det:</strong>",
      steps: [
        { title: "Del din personlige lenke", desc: "Send din unike henvisningslenke til venner, familie eller investormilj&oslash;et ditt." },
        { title: "De registrerer seg og verifiserer", desc: "Vennen din oppretter en trefolio-konto via lenken din og verifiserer e-posten sin. Det er alt &mdash; ikke noe kj&oslash;p p&aring;krevd." },
        { title: "Du tjener 30 dager Pro", desc: "Etter verifisering f&aring;r du automatisk 30 dager Trefolio Pro. Samle opp til 365 dager!" },
      ],
      referralLinkLabel: "Din henvisningslenke",
      referralLinkHint: "Del denne lenken med venner for &aring; begynne &aring; tjene",
      ctaLabel: "Del lenken din",
      tipText: "&#x1F4A1; <strong>Tips:</strong> Del p&aring; WhatsApp, Telegram eller X for maksimal rekkevidde. Jo flere venner som blir med, jo mer gratis Pro-tid tjener du!",
    },
  },
  cs: {
    footer: { receivedText: "Tento e-mail jste obdr&#382;eli od trefolio.", unsubscribeLabel: "Odhl&aacute;sit" },
    referral: {
      heading: "Sd&iacute;lejte trefolio, z&iacute;skejte Pro zdarma",
      intro: "Milujete trefolio? Sd&iacute;lejte ho s p&#345;&aacute;teli a z&iacute;skejte <strong>30 dn&iacute; Pro</strong> za ka&#382;d&eacute;ho p&#345;&iacute;tele, kter&yacute; se zaregistruje a ov&#283;&#345;&iacute; sv&#367;j &uacute;&#269;et.",
      howItWorks: "<strong>Jak to funguje:</strong>",
      steps: [
        { title: "Sd&iacute;lejte sv&#367;j osobn&iacute; odkaz", desc: "Po&scaron;lete sv&#367;j unik&aacute;tn&iacute; doporu&#269;ovac&iacute; odkaz p&#345;&aacute;tel&#367;m, rodin&#283; nebo investi&#269;n&iacute; komunit&#283;." },
        { title: "Zaregistruj&iacute; se a ov&#283;&#345;&iacute;", desc: "V&aacute;&#353; p&#345;&iacute;tel si vytvo&#345;&iacute; &uacute;&#269;et trefolio p&#345;es v&aacute;&#353; odkaz a ov&#283;&#345;&iacute; sv&#367;j e-mail. To je v&#353;e &mdash; &#382;&aacute;dn&yacute; n&aacute;kup nen&iacute; pot&#345;eba." },
        { title: "Z&iacute;sk&aacute;te 30 dn&iacute; Pro", desc: "Po ov&#283;&#345;en&iacute; automaticky z&iacute;sk&aacute;te 30 dn&iacute; Trefolio Pro. Nasbírejte a&#382; 365 dn&iacute;!" },
      ],
      referralLinkLabel: "V&aacute;&#353; doporu&#269;ovac&iacute; odkaz",
      referralLinkHint: "Sd&iacute;lejte tento odkaz s p&#345;&aacute;teli a za&#269;n&#283;te z&iacute;sk&aacute;vat",
      ctaLabel: "Sd&iacute;let sv&#367;j odkaz",
      tipText: "&#x1F4A1; <strong>Tip:</strong> Sd&iacute;lejte na WhatsApp, Telegram nebo X pro maxim&aacute;ln&iacute; dosah. &#268;&iacute;m v&iacute;ce p&#345;&aacute;tel se p&#345;id&aacute;, t&iacute;m v&iacute;ce Pro zdarma z&iacute;sk&aacute;te!",
    },
  },
  el: {
    footer: { receivedText: "Λάβατε αυτό το email από το trefolio.", unsubscribeLabel: "Κατάργηση εγγραφής" },
    referral: {
      heading: "Μοιραστείτε το trefolio, κερδίστε δωρεάν Pro χρόνο",
      intro: "Αγαπάτε το trefolio; Μοιραστείτε το με φίλους και κερδίστε <strong>30 ημέρες Pro</strong> για κάθε φίλο που εγγράφεται και επαληθεύει τον λογαριασμό του.",
      howItWorks: "<strong>Πώς λειτουργεί:</strong>",
      steps: [
        { title: "Μοιραστείτε τον προσωπικό σας σύνδεσμο", desc: "Στείλτε τον μοναδικό σύνδεσμο παραπομπής σας σε φίλους, οικογένεια ή την επενδυτική σας κοινότητα." },
        { title: "Εγγράφονται και επαληθεύουν", desc: "Ο φίλος σας δημιουργεί λογαριασμό trefolio μέσω του συνδέσμου σας και επαληθεύει το email του. Αυτό είναι &mdash; δεν απαιτείται αγορά." },
        { title: "Κερδίζετε 30 ημέρες Pro", desc: "Μετά την επαλήθευση, λαμβάνετε αυτόματα 30 ημέρες Trefolio Pro. Συγκεντρώστε έως 365 ημέρες!" },
      ],
      referralLinkLabel: "Ο σύνδεσμος παραπομπής σας",
      referralLinkHint: "Μοιραστείτε αυτόν τον σύνδεσμο με φίλους για να αρχίσετε να κερδίζετε",
      ctaLabel: "Μοιραστείτε τον σύνδεσμό σας",
      tipText: "&#x1F4A1; <strong>Συμβουλή:</strong> Μοιραστείτε στο WhatsApp, Telegram ή X για μέγιστη εμβέλεια. Όσο περισσότεροι φίλοι εγγράφονται, τόσο περισσότερο δωρεάν Pro χρόνο κερδίζετε!",
    },
  },
  ro: {
    footer: { receivedText: "A&#355;i primit acest email de la trefolio.", unsubscribeLabel: "Dezabonare" },
    referral: {
      heading: "Împărtășiți trefolio, câștigați timp Pro gratuit",
      intro: "Vă place trefolio? Împărtășiți-l cu prietenii și câștigați <strong>30 de zile de Pro</strong> pentru fiecare prieten care se înregistrează și își verifică contul.",
      howItWorks: "<strong>Cum funcționează:</strong>",
      steps: [
        { title: "Împărtășiți linkul personal", desc: "Trimiteți linkul unic de recomandare prietenilor, familiei sau comunității de investitori." },
        { title: "Se înregistrează și verifică", desc: "Prietenul dvs. creează un cont trefolio prin linkul dvs. și verifică emailul. Asta e tot &mdash; fără achiziție necesară." },
        { title: "Câștigați 30 de zile Pro", desc: "După verificare, primiți automat 30 de zile Trefolio Pro. Acumulați până la 365 de zile!" },
      ],
      referralLinkLabel: "Linkul dvs. de recomandare",
      referralLinkHint: "Împărtășiți acest link cu prietenii pentru a începe să câștigați",
      ctaLabel: "Împărtășiți linkul",
      tipText: "&#x1F4A1; <strong>Sfat:</strong> Distribuiți pe WhatsApp, Telegram sau X pentru acoperire maximă. Cu cât mai mulți prieteni se alătură, cu atât mai mult timp Pro gratuit câștigați!",
    },
  },
  hu: {
    footer: { receivedText: "Ezt az e-mailt a trefolio-t&oacute;l kapta.", unsubscribeLabel: "Leiratkoz&aacute;s" },
    referral: {
      heading: "Ossza meg a trefolio-t, szerezzen ingyenes Pro id&#337;t",
      intro: "Szereti a trefolio-t? Ossza meg bar&aacute;taival &eacute;s szerezzen <strong>30 nap Pro-t</strong> minden bar&aacute;tj&aacute;&eacute;rt, aki regisztr&aacute;l &eacute;s igazolja fi&oacute;kj&aacute;t.",
      howItWorks: "<strong>&Iacute;gy m&#369;k&ouml;dik:</strong>",
      steps: [
        { title: "Ossza meg szem&eacute;lyes linkj&eacute;t", desc: "K&uuml;ldje el egyedi aj&aacute;nl&oacute; linkj&eacute;t bar&aacute;tainak, csal&aacute;dj&aacute;nak vagy befektet&#337;i k&ouml;z&ouml;ss&eacute;g&eacute;nek." },
        { title: "Regisztr&aacute;lnak &eacute;s igazolnak", desc: "Bar&aacute;tja l&eacute;trehoz egy trefolio fi&oacute;kot az &Ouml;n linkj&eacute;n kereszt&uuml;l &eacute;s igazolja e-mail-j&eacute;t. Ennyi &mdash; v&aacute;s&aacute;rl&aacute;s nem sz&uuml;ks&eacute;ges." },
        { title: "Szerezzen 30 nap Pro-t", desc: "Az igazol&aacute;s ut&aacute;n automatikusan kap 30 nap Trefolio Pro-t. Gy&#369;jts&ouml;n &ouml;ssze ak&aacute;r 365 napot!" },
      ],
      referralLinkLabel: "Az &Ouml;n aj&aacute;nl&oacute; linkje",
      referralLinkHint: "Ossza meg ezt a linket bar&aacute;taival a keres&eacute;s megkezd&eacute;s&eacute;hez",
      ctaLabel: "Link megoszt&aacute;sa",
      tipText: "&#x1F4A1; <strong>Tipp:</strong> Ossza meg WhatsApp-on, Telegramon vagy X-en a maxim&aacute;lis el&eacute;r&eacute;s &eacute;rdek&eacute;ben. Min&eacute;l t&ouml;bb bar&aacute;t csatlakozik, ann&aacute;l t&ouml;bb ingyenes Pro id&#337;t szerez!",
    },
  },
  tr: {
    footer: { receivedText: "Bu e-postay&#305; trefolio&#39;dan ald&#305;n&#305;z.", unsubscribeLabel: "Abonelikten &#231;&#305;k" },
    referral: {
      heading: "trefolio&#39;yu payla&#351;&#305;n, &uuml;cretsiz Pro kazan&#305;n",
      intro: "trefolio&#39;yu seviyor musunuz? Arkada&#351;lar&#305;n&#305;zla payla&#351;&#305;n ve kaydolan ve hesab&#305;n&#305; do&#287;rulayan her arkada&#351; i&ccedil;in <strong>30 g&uuml;n Pro</strong> kazan&#305;n.",
      howItWorks: "<strong>Nas&#305;l &ccedil;al&#305;&#351;&#305;r:</strong>",
      steps: [
        { title: "Ki&#351;isel linkinizi payla&#351;&#305;n", desc: "Benzersiz y&ouml;nlendirme linkinizi arkada&#351;lar&#305;n&#305;za, ailenize veya yat&#305;r&#305;mc&#305; toplulu&#287;unuza g&ouml;nderin." },
        { title: "Kaydolur ve do&#287;rularlar", desc: "Arkada&#351;&#305;n&#305;z linkiniz &uuml;zerinden bir trefolio hesab&#305; olu&#351;turur ve e-postas&#305;n&#305; do&#287;rular. Hepsi bu &mdash; sat&#305;n alma gerekmiyor." },
        { title: "30 g&uuml;n Pro kazan&#305;rs&#305;n&#305;z", desc: "Do&#287;rulamadan sonra otomatik olarak 30 g&uuml;n Trefolio Pro al&#305;rs&#305;n&#305;z. 365 g&uuml;ne kadar biriktirin!" },
      ],
      referralLinkLabel: "Y&ouml;nlendirme linkiniz",
      referralLinkHint: "Kazanmaya ba&#351;lamak i&ccedil;in bu linki arkada&#351;lar&#305;n&#305;zla payla&#351;&#305;n",
      ctaLabel: "Linkinizi payla&#351;&#305;n",
      tipText: "&#x1F4A1; <strong>İpucu:</strong> Maksimum eri&#351;im i&ccedil;in WhatsApp, Telegram veya X&#39;te payla&#351;&#305;n. Ne kadar &ccedil;ok arkada&#351; kat&#305;l&#305;rsa, o kadar &ccedil;ok &uuml;cretsiz Pro kazanırsınız!",
    },
  },
  uk: {
    footer: { receivedText: "Ви отримали цей лист від trefolio.", unsubscribeLabel: "Відписатися" },
    referral: {
      heading: "Поділіться trefolio, заробіть безкоштовний Pro час",
      intro: "Любите trefolio? Поділіться з друзями та заробіть <strong>30 днів Pro</strong> за кожного друга, який зареєструється та підтвердить свій акаунт.",
      howItWorks: "<strong>Як це працює:</strong>",
      steps: [
        { title: "Поділіться своїм особистим посиланням", desc: "Відправте унікальне реферальне посилання друзям, родині чи інвестиційній спільноті." },
        { title: "Вони реєструються та підтверджують", desc: "Ваш друг створює акаунт trefolio за вашим посиланням і підтверджує email. Це все &mdash; покупка не потрібна." },
        { title: "Ви заробляєте 30 днів Pro", desc: "Після підтвердження автоматично отримуєте 30 днів Trefolio Pro. Накопичуйте до 365 днів!" },
      ],
      referralLinkLabel: "Ваше реферальне посилання",
      referralLinkHint: "Поділіться цим посиланням з друзями, щоб почати заробляти",
      ctaLabel: "Поділитися посиланням",
      tipText: "&#x1F4A1; <strong>Порада:</strong> Діліться у WhatsApp, Telegram чи X для максимального охоплення. Чим більше друзів приєднається, тим більше безкоштовного Pro часу ви заробите!",
    },
  },
};
