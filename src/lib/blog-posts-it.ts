import { registerPost } from "./blog";

registerPost({
  slug: "miglior-tracker-portafoglio-degiro",
  title: "Miglior tracker di portafoglio per DEGIRO nel 2026",
  description:
    "Perché gli utenti DEGIRO hanno bisogno di un tracker dedicato, funzionalità trefolio (import CSV da 14 broker, sync SnapTrade, analisi IA, 35 lingue, multi-valuta, simulatore, screener, patrimonio netto, report fiscali UE per l'Italia). Guida passo-passo all'importazione DEGIRO.",
  date: "2026-03-13",
  readingTime: "9 min read",
  keywords: [
    "miglior tracker portafoglio DEGIRO",
    "tracker investimenti DEGIRO Italia",
    "importare portafoglio DEGIRO",
    "seguire investimenti DEGIRO",
    "tracker gratuito DEGIRO 2026",
    "alternativa portfolio DEGIRO",
    "gestione portafoglio DEGIRO Italia",
    "tracker azioni DEGIRO",
  ],
  lang: "it",
  alternates: {
    en: "how-to-import-degiro-portfolio",
    es: "mejor-tracker-inversiones-degiro",
    fr: "meilleur-suivi-portefeuille-degiro",
    de: "beste-portfolio-tracker-degiro",
    it: "miglior-tracker-portafoglio-degiro",
    pt: "melhor-tracker-carteira-degiro",
    nl: "beste-portfolio-tracker-degiro-nl",
    pl: "najlepszy-tracker-portfela-degiro",
    sv: "basta-portfoljtracker-degiro",
    da: "bedste-portefolje-tracker-degiro",
    fi: "paras-salkkuseuranta-degiro",
  },
  content: /* html */ `
<h2>Perché gli utenti DEGIRO hanno bisogno di un tracker dedicato</h2>
<p>DEGIRO è uno dei broker più popolari in Europa. Offre commissioni basse e accesso ai mercati globali, ma la sua interfaccia di portafoglio ha limiti evidenti: vedi le tue posizioni, ma non metriche di performance, proiezioni sui dividendi né analisi aggregate se combini più conti o broker. Per questo molti investitori cercano un tracker dedicato che integri DEGIRO.</p>
<p>L'app DEGIRO mostra il valore attuale delle tue posizioni e poco più. Se vuoi conoscere la tua redditività reale (TTWROR, IRR), confrontarti con S&P 500 o Euro Stoxx 50, proiettare i dividendi a 5 anni o avere un report fiscale pronto per la dichiarazione, ti servono strumenti aggiuntivi.</p>

<h2>Cosa offre trefolio agli utenti DEGIRO</h2>
<p>trefolio è pensato per investitori europei. Ecco le funzionalità più utili se operi con DEGIRO:</p>

<h3>Importazione CSV da 14 broker</h3>
<p>trefolio supporta l'importazione diretta da CSV di DEGIRO, Interactive Brokers, Trading 212, Revolut e altri 10 broker. Esporti il file Account.csv da DEGIRO, lo carichi su trefolio e in meno di 2 minuti hai l'intero portafoglio importato con acquisti, vendite, dividendi e commissioni.</p>

<h3>Sincronizzazione automatica con SnapTrade</h3>
<p>Se preferisci non esportare CSV ogni volta che operi, puoi collegare il tuo broker tramite SnapTrade. Il portafoglio si aggiorna automaticamente ogni 6 ore. DEGIRO non è ancora nella lista SnapTrade, ma IBKR e altri broker sì — utile se combini più conti.</p>

<h3>Analisi IA del tuo portafoglio</h3>
<p>Puoi chiedere all'IA informazioni su qualsiasi titolo del tuo portafoglio: fondamentali, rischi, sostenibilità dei dividendi, concentrazione settoriale. L'analisi è disponibile in 35 lingue, incluso l'italiano.</p>

<h3>Multi-valuta (EUR, USD, GBP)</h3>
<p>Se hai posizioni in dollari, sterline o euro, trefolio converte tutto nella tua valuta base con tassi di cambio in tempo reale. Nessun calcolo manuale necessario.</p>

<h3>Simulatore di portafoglio</h3>
<p>Backtest di strategie DCA fino a 30 anni, scenari what-if e stress test contro crisi storiche (2008, COVID, dot-com). Ideale per pianificare prima di modificare l'allocazione.</p>

<h3>Stock screener e patrimonio netto</h3>
<p>Filtra oltre 600 azioni europee per yield, P/E, settore e borsa. Aggiungi immobili, risparmi e pensioni per vedere il tuo patrimonio netto completo.</p>

<h3>Report fiscali per l'Italia</h3>
<p>trefolio genera report fiscali adatti all'Italia: Quadro RT per le plusvalenze, Quadro RW per il monitoraggio degli investimenti esteri, IVAFE, base di costo LIFO come richiesto dalla legge italiana. Dividendi e ritenute calcolati automaticamente.</p>

<h2>Come importare il tuo portafoglio DEGIRO passo-passo</h2>
<ol>
<li>Accedi al tuo conto DEGIRO su <strong>trader.degiro.nl</strong> (o il tuo dominio regionale).</li>
<li>Vai su <strong>Attività</strong> → <strong>Conto</strong>.</li>
<li>Seleziona l'intervallo di date che copra tutte le tue operazioni (consigliato: dalla data di apertura del conto).</li>
<li>Clicca su <strong>Esporta</strong> e scegli <strong>CSV</strong>.</li>
<li>Salva il file (ad esempio <code>Account.csv</code>).</li>
<li>In trefolio, vai su <strong>Importa</strong>, seleziona <strong>DEGIRO</strong> e trascina il CSV.</li>
<li>Rivedi l'anteprima e clicca su <strong>Importa tutto</strong>.</li>
</ol>
<p>Il tuo portafoglio apparirà sulla dashboard con prezzi in tempo reale, valore totale, variazione giornaliera e metriche di performance.</p>

<h2>Confronto con fogli di calcolo e altri strumenti</h2>
<table>
<thead>
<tr><th>Caratteristica</th><th>trefolio</th><th>Excel/Google Sheets</th><th>Altri tracker</th></tr>
</thead>
<tbody>
<tr><td>Importazione DEGIRO</td><td>CSV diretto</td><td>Manuale</td><td>Variabile</td></tr>
<tr><td>Metriche TTWROR/IRR</td><td>Automatiche</td><td>Formule complesse</td><td>Alcuni sì</td></tr>
<tr><td>Report fiscali Italia</td><td>Sì (Quadro RT/RW)</td><td>Manuale</td><td>Pochi</td></tr>
<tr><td>Analisi IA</td><td>Sì</td><td>No</td><td>Pochi</td></tr>
<tr><td>Multi-valuta</td><td>Automatico</td><td>Manuale</td><td>Variabile</td></tr>
<tr><td>Lingue</td><td>35</td><td>—</td><td>Limitato</td></tr>
</tbody>
</table>

<h2>Prezzi trefolio</h2>
<ul>
<li><strong>Folio (gratuito):</strong> fino a 15 posizioni, quotazioni in tempo reale, 5 consultazioni IA al mese, report fiscali base.</li>
<li><strong>Bifolio (€2,99/mese):</strong> più posizioni, alert via WhatsApp e push.</li>
<li><strong>Trefolio (€7,99/mese):</strong> posizioni illimitate, IA illimitata, fondamentali, screener completo, export CSV.</li>
</ul>

<h2>Conclusione</h2>
<p>Se usi DEGIRO e vuoi un monitoraggio serio del tuo portafoglio — performance reale, dividendi, fiscalità italiana e analisi IA — trefolio è un'opzione solida. L'importazione via CSV è veloce e non richiede carta di credito per provare.</p>
<p><a href="https://trefolio.com/signup">Crea un account gratuito su trefolio</a> e prova con il tuo portafoglio reale DEGIRO.</p>
`,
});

registerPost({
  slug: "degiro-tasse-italia-quadro-rw",
  title: "DEGIRO e tasse in Italia — Quadro RT/RW e IVAFE con trefolio",
  description:
    "Guida alla dichiarazione fiscale DEGIRO in Italia: regime dichiarativo, Quadro RT per plusvalenze, Quadro RW per monitoraggio patrimoniale, IVAFE, base di costo LIFO, dividendi e ritenute. trefolio genera il report fiscale automaticamente.",
  date: "2026-03-13",
  readingTime: "10 min read",
  keywords: [
    "DEGIRO tasse Italia",
    "DEGIRO dichiarazione dei redditi",
    "DEGIRO Quadro RT Quadro RW",
    "IVAFE DEGIRO Italia",
    "plusvalenze DEGIRO dichiarare",
    "dividendi DEGIRO tasse Italia",
    "investimenti esteri Quadro RW",
    "regime dichiarativo DEGIRO",
  ],
  lang: "it",
  content: /* html */ `
<h2>Il problema della dichiarazione DEGIRO in Italia</h2>
<p>Dichiarare gli investimenti in DEGIRO nella dichiarazione dei redditi italiana può essere noioso. Plusvalenze, minusvalenze, dividendi, ritenute alla fonte, Quadro RT per i guadagni da capitale, Quadro RW per il monitoraggio degli investimenti esteri, IVAFE… Tutto richiede ordinare dati da molteplici operazioni e assicurarsi che quadrino con l'Agenzia delle Entrate.</p>
<p>Con il regime dichiarativo, ogni anno devi riportare correttamente i tuoi investimenti esteri. Un errore può generare accertamenti o sanzioni. trefolio semplifica il processo generando un report fiscale pronto per essere trasferito nei quadri corretti.</p>

<h2>Cosa fa trefolio per te in materia fiscale</h2>
<p>trefolio genera report fiscali specifici per l'Italia a partire dal portafoglio importato. Ecco le funzioni chiave:</p>

<h3>Quadro RT — Plusvalenze e minusvalenze</h3>
<p>Il Quadro RT della dichiarazione dei redditi italiana contiene le plusvalenze e minusvalenze da cessione di titoli. trefolio calcola automaticamente i guadagni e le perdite da ogni vendita, applicando la base di costo LIFO come richiesto dalla legge italiana. Non devi interpretare il precompilato da solo: il report ti indica cosa inserire in ogni riga.</p>

<h3>Quadro RW — Monitoraggio patrimoniale estero</h3>
<p>Il Quadro RW serve a dichiarare il valore degli investimenti detenuti all'estero (inclusa la conta DEGIRO) al 31 dicembre. È obbligatorio per chi supera determinate soglie. trefolio ti avvisa quando ti avvicini o superi questi limiti, così non ti sfugge l'obbligo.</p>

<h3>Calcolo IVAFE</h3>
<p>L'IVAFE (Imposta sul Valore delle Attività Finanziarie detenute all'estero) si applica sul valore medio annuo degli investimenti esteri. trefolio calcola l'importo in base ai dati del tuo portafoglio e ti indica come riportarlo in dichiarazione.</p>

<h3>Base di costo LIFO</h3>
<p>La legge italiana richiede il metodo LIFO (Last In, First Out) per determinare la base di costo delle azioni vendute. trefolio applica automaticamente il LIFO a tutte le tue operazioni, così le plusvalenze e minusvalenze sono calcolate correttamente.</p>

<h3>Dividendi e ritenute</h3>
<p>I dividendi vanno dichiarati come redditi da capitale. Le ritenute applicate alla fonte (ad esempio 15% o 30% sui dividendi USA) vanno indicate per ottenere il credito d'imposta. trefolio estrae dividendi e ritenute dal tuo CSV DEGIRO e li organizza nel formato richiesto.</p>

<h3>AI Tax Assistant</h3>
<p>L'assistente fiscale IA di trefolio risponde a domande su come dichiarare, quali quadri compilare e come gestire casi particolari. Utile per chiarire dubbi prima di inviare la dichiarazione.</p>

<h2>Guida passo-passo alla dichiarazione</h2>
<ol>
<li><strong>Importa il tuo portafoglio DEGIRO</strong> — esporta l'Account.csv dal sito DEGIRO e caricalo su trefolio.</li>
<li><strong>Verifica i dati</strong> — controlla che acquisti, vendite, dividendi e commissioni siano corretti.</li>
<li><strong>Genera il report fiscale</strong> — vai alla sezione Fiscale e seleziona il report per l'Italia.</li>
<li><strong>Trasferisci nei quadri</strong> — usa i valori del report per compilare Quadro RT, Quadro RW e le sezioni relative a dividendi e IVAFE.</li>
<li><strong>Conserva la documentazione</strong> — tieni il report e il CSV DEGIRO come prova in caso di accertamento.</li>
</ol>

<h2>Implicazioni ISEE</h2>
<p>Gli investimenti in DEGIRO rientrano nel calcolo dell'ISEE se superano le franchigie previste. Il valore da indicare è quello al 31 dicembre (o la media annua per l'IVAFE). trefolio ti fornisce questi dati nel report, così puoi inserirli correttamente nella DSU (Dichiarazione Sostitutiva Unica) se necessario.</p>

<h2>Conclusione</h2>
<p>Dichiarare DEGIRO in Italia non deve essere un incubo. Con trefolio hai un report fiscale strutturato che ti guida attraverso Quadro RT, Quadro RW, IVAFE e dividendi. La base di costo LIFO è calcolata automaticamente e l'AI Tax Assistant è a disposizione per i dubbi.</p>
<p><a href="https://trefolio.com/signup">Crea un account gratuito su trefolio</a> e importa il tuo portafoglio DEGIRO per generare il report fiscale.</p>
`,
});

registerPost({
  slug: "miglior-tracker-trading-212",
  title: "Miglior tracker di portafoglio per Trading 212 nel 2026",
  description:
    "Perché gli utenti Trading 212 hanno bisogno di un tracker esterno, funzionalità trefolio, guida all'importazione CSV Trading 212, confronto e prezzi.",
  date: "2026-03-13",
  readingTime: "8 min read",
  keywords: [
    "miglior tracker portafoglio Trading 212",
    "tracker investimenti Trading 212 Italia",
    "importare portafoglio Trading 212",
    "seguire investimenti Trading 212",
    "tracker gratuito Trading 212",
    "alternativa portfolio Trading 212",
    "gestione portafoglio Trading 212",
    "Trading 212 CSV import",
  ],
  lang: "it",
  content: /* html */ `
<h2>Perché gli utenti Trading 212 hanno bisogno di un tracker esterno</h2>
<p>Trading 212 è uno dei broker più usati in Europa per investimenti a commissioni zero e azioni frazionarie. L'app mostra le tue posizioni e il valore del portafoglio, ma manca di funzionalità avanzate: metriche di performance come TTWROR e IRR, proiezioni sui dividendi, confronto con benchmark, analisi IA e report fiscali pronti per la dichiarazione.</p>
<p>Se hai più conti (Trading 212 + DEGIRO, IBKR o altro) non puoi vedere il portafoglio aggregato. Un tracker esterno come trefolio risolve questi problemi: importi il CSV di Trading 212 e ottieni un dashboard completo con tutto ciò che il broker non offre.</p>

<h2>Cosa offre trefolio agli utenti Trading 212</h2>
<p>trefolio è pensato per investitori europei e supporta l'importazione diretta da Trading 212. Ecco le funzionalità più utili:</p>

<h3>Importazione CSV Trading 212</h3>
<p>Esporti il file delle transazioni da Trading 212, lo carichi su trefolio e in pochi minuti hai l'intero portafoglio importato. trefolio riconosce acquisti, vendite, dividendi, commissioni e azioni frazionarie.</p>

<h3>14 broker supportati</h3>
<p>Oltre a Trading 212, trefolio importa da DEGIRO, Interactive Brokers, Revolut e altri 10 broker. Puoi aggregare tutti i tuoi investimenti in un unico portafoglio.</p>

<h3>Analisi IA e 35 lingue</h3>
<p>Chiedi all'IA informazioni su qualsiasi titolo del tuo portafoglio. L'analisi è disponibile in italiano e altre 34 lingue.</p>

<h3>Multi-valuta e report fiscali</h3>
<p>trefolio converte automaticamente EUR, USD, GBP e altre valute. Per l'Italia genera report per Quadro RT, Quadro RW e IVAFE.</p>

<h3>Simulatore e stock screener</h3>
<p>Backtest DCA, scenari what-if, stress test e screener su oltre 600 azioni europee. Aggiungi immobili e risparmi per il patrimonio netto completo.</p>

<h2>Come importare il portafoglio Trading 212 passo-passo</h2>
<ol>
<li>Accedi al tuo conto Trading 212 dall'app o dal sito web.</li>
<li>Vai su <strong>Conto</strong> → <strong>Cronologia</strong> (o <strong>History</strong>).</li>
<li>Seleziona l'intervallo di date che copra tutte le transazioni.</li>
<li>Esporta in formato <strong>CSV</strong>.</li>
<li>In trefolio, vai su <strong>Importa</strong>, seleziona <strong>Trading 212</strong> e trascina il file CSV.</li>
<li>Rivedi l'anteprima e clicca su <strong>Importa tutto</strong>.</li>
</ol>
<p>Il portafoglio apparirà sulla dashboard con prezzi in tempo reale, valore totale e metriche di performance.</p>

<h2>Confronto con altre soluzioni</h2>
<table>
<thead>
<tr><th>Caratteristica</th><th>trefolio</th><th>Excel/Sheets</th><th>Altri tracker</th></tr>
</thead>
<tbody>
<tr><td>Importazione Trading 212</td><td>CSV diretto</td><td>Manuale</td><td>Variabile</td></tr>
<tr><td>Metriche TTWROR/IRR</td><td>Automatiche</td><td>Formule complesse</td><td>Alcuni sì</td></tr>
<tr><td>Report fiscali Italia</td><td>Sì</td><td>Manuale</td><td>Pochi</td></tr>
<tr><td>Analisi IA</td><td>Sì</td><td>No</td><td>Pochi</td></tr>
<tr><td>Azioni frazionarie</td><td>Sì</td><td>Manuale</td><td>Variabile</td></tr>
</tbody>
</table>

<h2>Prezzi trefolio</h2>
<ul>
<li><strong>Folio (gratuito):</strong> fino a 15 posizioni, quotazioni in tempo reale, 5 consultazioni IA al mese.</li>
<li><strong>Bifolio (€2,99/mese):</strong> più posizioni, alert push e WhatsApp.</li>
<li><strong>Trefolio (€7,99/mese):</strong> posizioni illimitate, IA illimitata, report fiscali completi, screener, export CSV.</li>
</ul>

<h2>Conclusione</h2>
<p>Se usi Trading 212 e vuoi un monitoraggio professionale del tuo portafoglio — performance reale, dividendi, fiscalità italiana e analisi IA — trefolio è un'opzione solida. L'importazione via CSV è veloce e non richiede carta di credito per provare.</p>
<p><a href="https://trefolio.com/signup">Crea un account gratuito su trefolio</a> e prova con il tuo portafoglio Trading 212.</p>
`,
});
