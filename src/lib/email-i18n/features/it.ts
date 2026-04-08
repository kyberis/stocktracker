import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Hai ricevuto questa e-mail da trefolio.",
  unsubscribeLabel: "Annulla iscrizione"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Quotazioni in tempo reale",
    intro: "La tua dashboard del portafoglio aggiorna i prezzi in tempo reale durante la giornata di negoziazione — nessun aggiornamento manuale necessario.",
    sectionLabel: "Cosa ottieni:",
    features: [
      {
        title: "60+ borse",
        desc: "Prezzi da NYSE, NASDAQ, Euronext, Londra, Francoforte e altro — powered by Yahoo Finance."
      },
      {
        title: "Auto-aggiornamento",
        desc: "Le quotazioni si aggiornano ogni 15 secondi (configurabile a 30s o 60s nelle impostazioni)."
      },
      {
        title: "Multi-valuta",
        desc: "Visualizza i valori nella tua valuta locale. Supportiamo 21 valute con conversione automatica."
      }
    ],
    tierText: "Disponibile su tutti i piani",
    ctaLabel: "Apri la tua dashboard"
  },
  "feature-dividend-tracking": {
    heading: "Tracciamento dividendi",
    intro: "trefolio rileva automaticamente i dividendi dalle tue posizioni e costruisce un quadro completo del reddito.",
    sectionLabel: "Cosa ottieni:",
    features: [
      {
        title: "Calendario dividendi",
        desc: "Vedi i pagamenti in arrivo mese per mese. Sappi esattamente quando i dividendi arrivano sul tuo conto."
      },
      {
        title: "Reddito annuale",
        desc: "Reddito totale da dividendi previsto su tutto il portafoglio con scomposizione per titolo."
      },
      {
        title: "Rendimento sul costo",
        desc: "Traccia il tuo rendimento reale basato sul prezzo di acquisto — non solo l'attuale tasso di dividendo."
      },
      {
        title: "Simulazione DRIP",
        desc: "Vedi come reinvestire i dividendi potrebbe far crescere i tuoi rendimenti in 5, 10 o 20 anni."
      }
    ],
    tierText: "Disponibile su tutti i piani",
    ctaLabel: "Visualizza i tuoi dividendi"
  },
  "feature-ai-analysis": {
    heading: "Analisi azionaria con IA",
    intro: "Chiedi alla nostra IA informazioni su qualsiasi titolo nel tuo portafoglio o su qualsiasi ticker che stai considerando. Ottieni analisi di qualit&agrave; istituzionale in secondi.",
    sectionLabel: "Cosa puoi chiedere:",
    features: [
      {
        title: "Analisi degli utili",
        desc: "\"Come sono stati gli ultimi utili di AAPL?\" — riepilogo di risultati, indicazioni e reazione del mercato."
      },
      {
        title: "Valutazione del rischio",
        desc: "\"Quali sono i rischi di detenere TSLA?\" — minacce competitive, valutazione e fattori macro."
      },
      {
        title: "Confronto concorrenti",
        desc: "\"Confronta MSFT vs GOOG\" — analisi fianco a fianco di finanza, crescita e valutazione."
      },
      {
        title: "Revisione portafoglio",
        desc: "\"Rivedi il mio portafoglio\" — l'IA analizza allocazione, rischio e suggerisce miglioramenti."
      }
    ],
    tierText: "Folio: 5 chiamate/mese | Bifolio: 20/mese | Trefolio: Illimitato",
    ctaLabel: "Prova l'analisi IA ora"
  },
  "feature-price-alerts": {
    heading: "Avvisi di prezzo",
    intro: "Non perdere mai un movimento di prezzo importante. Imposta prezzi target e ricevi notifiche quando un titolo supera la tua soglia.",
    sectionLabel: "Come funziona:",
    features: [
      {
        title: "Avvisi soglia",
        desc: "Imposta obiettivi di prezzo \"sopra\" o \"sotto\". Ricevi notifiche quando un titolo supera la tua linea."
      },
      {
        title: "Avvisi variazione %",
        desc: "Traccia variazioni percentuali giornaliere o dall'acquisto. Cogli cali o rally in anticipo."
      },
      {
        title: "Multi-canale",
        desc: "Avvisi email e push su Bifolio. Aggiungi WhatsApp e avvisi dispositivo su Trefolio."
      },
      {
        title: "Alimentato da cron",
        desc: "Il nostro sistema controlla i prezzi ogni minuto durante l'orario di mercato. Non devi mai guardare lo schermo."
      }
    ],
    tierText: "Bifolio: Fino a 10 avvisi | Trefolio: Avvisi illimitati",
    ctaLabel: "Crea il tuo primo avviso"
  },
  "feature-broker-import": {
    heading: "Importazione portafoglio",
    intro: "Aggiungi azioni manualmente una per una? C'&egrave; un modo pi&ugrave; veloce. trefolio supporta tre metodi di importazione per ottenere il portafoglio completo in secondi.",
    sectionLabel: "Scegli il tuo metodo:",
    features: [
      {
        title: "Sync Broker",
        desc: "Collega il tuo broker e sincronizziamo automaticamente posizioni, liquidit&agrave; e transazioni. Setup con un clic, sempre aggiornato."
      },
      {
        title: "Caricamento CSV",
        desc: "Esporta un CSV dal broker e caricarlo. Supportiamo 20+ formati broker tra cui DEGIRO, Interactive Brokers, Trade Republic e altri."
      },
      {
        title: "Import IA",
        desc: "Carica qualsiasi file — CSV, PDF o screenshot — e la nostra IA lo trasformer&agrave; in portafoglio. Funziona anche con formati insoliti."
      }
    ],
    tierText: "Folio: CSV e Manuale | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importa il tuo portafoglio"
  },
  "feature-fundamentals": {
    heading: "Fondamentali aziendali",
    intro: "Vai oltre i prezzi. trefolio ti d&agrave; accesso alle finanze complete dell'azienda — gli stessi dati usati dagli analisti professionisti.",
    sectionLabel: "Cosa ottieni:",
    features: [
      {
        title: "Conto economico",
        desc: "Ricavi, utile netto, margini e utile per azione — trimestrale e annuale."
      },
      {
        title: "Stato patrimoniale",
        desc: "Attivit&agrave;, passivit&agrave;, livelli di debito e valore contabile a colpo d'occhio."
      },
      {
        title: "Flusso di cassa",
        desc: "Flussi operativi, di investimento e finanziari. Vedi se l'azienda genera cassa reale."
      },
      {
        title: "Operazioni degli insider",
        desc: "Vedi cosa comprano e vendono dirigenti e amministratori."
      },
      {
        title: "Partecipazioni istituzionali",
        desc: "Segui cosa possiedono i grandi fondi — Vanguard, BlackRock, Fidelity e altri."
      }
    ],
    tierText: "Esclusivo Trefolio Pro",
    ctaLabel: "Esplora i fondamentali"
  },
  "feature-stock-screener": {
    heading: "Filtro azionario",
    intro: "Scopri azioni che corrispondono ai tuoi criteri di investimento. Filtra 600+ azioni su pi&ugrave; dimensioni e applica strategie collaudate.",
    sectionLabel: "Filtra per:",
    features: [
      {
        title: "6 dimensioni di filtro",
        desc: "Capitalizzazione, rapporto P/E, rendimento dividendi, settore, paese e borsa. Combina quante ne vuoi."
      },
      {
        title: "5 strategie integrate",
        desc: "Investimento value, crescita dividendi, momentum, qualit&agrave; e small-cap — preset con un clic."
      },
      {
        title: "Dati ricchi",
        desc: "Prezzo, variazione %, capitalizzazione, P/E, rendimento dividendi e settore per ogni risultato."
      },
      {
        title: "Aggiunta rapida",
        desc: "Trovato qualcosa di interessante? Aggiungilo al portafoglio o alla watchlist direttamente dai risultati."
      }
    ],
    tierText: "Esclusivo Trefolio Pro",
    ctaLabel: "Apri il filtro"
  },
  "feature-moat-screener": {
    heading: "Moat Screener",
    intro: "Filtra centinaia di azioni che hanno gi&agrave; una valutazione in stile moat &mdash; otto criteri ispirati a come gli investitori ragionano sulle aziende durature.",
    sectionLabel: "Cosa ottieni:",
    features: [
      {
        title: "Oltre 680 titoli pre-valutati",
        desc: "Un universo condiviso di punteggi, aggiornato nel tempo cos&igrave; non parti da zero."
      },
      {
        title: "Otto criteri a colpo d'occhio",
        desc: "Ogni azione mostra superato, avviso o non superato su tutta la checklist &mdash; qualit&agrave; degli utili, margini, ROE, debito e altro."
      },
      {
        title: "Filtra come preferisci",
        desc: "Punteggio minimo, settore e P/E &mdash; combina i filtri per trovare idee adatte al tuo processo."
      },
      {
        title: "Dove si apre",
        desc: "Vai su <strong>Strumenti &rarr; Valutazione azioni</strong> e seleziona la scheda <strong>Moat Screener</strong>."
      }
    ],
    tierText: "Esclusivo Trefolio Pro",
    ctaLabel: "Apri la valutazione azioni"
  },
  "feature-tax-reports": {
    heading: "Report fiscali",
    intro: "Le dichiarazioni fiscali non devono essere dolorose. trefolio genera report fiscali specifici per paese e include un Assistente Fiscale IA per le tue domande.",
    sectionLabel: "Cosa ottieni:",
    features: [
      {
        title: "5 paesi UE",
        desc: "Report specifici per paese per Germania, Francia, Spagna, Paesi Bassi e Italia."
      },
      {
        title: "Plusvalenze e minusvalenze",
        desc: "Plusvalenze, minusvalenze e periodo di detenzione calcolati per ogni posizione."
      },
      {
        title: "Reddito da dividendi",
        desc: "Dividendi lordi, ritenuta alla fonte e reddito netto per paese di origine."
      },
      {
        title: "Assistente Fiscale IA",
        desc: "Fai domande come \"Quanto ho pagato di ritenuta sui dividendi USA?\" e ottieni risposte istantanee."
      }
    ],
    tierText: "Esclusivo Trefolio Pro",
    ctaLabel: "Genera il tuo report fiscale"
  },
  "feature-portfolio-simulator": {
    heading: "Simulatore di portafoglio",
    intro: "Testa le tue idee di investimento prima di impegnare denaro reale. Il simulatore ti permette di fare backtest, stress test ed esplorare scenari what-if.",
    sectionLabel: "Tre modalit&agrave;:",
    features: [
      {
        title: "Backtest",
        desc: "Vedi come un portafoglio avrebbe performato storicamente. Confronta con S&P 500, MSCI World o un benchmark personalizzato."
      },
      {
        title: "Stress test",
        desc: "E se il mercato crollasse del 30%? E se i tassi salissero? Vedi come il tuo portafoglio regge in diversi scenari."
      },
      {
        title: "Analisi what-if",
        desc: "Aggiungi o rimuovi posizioni, cambia le allocazioni e vedi istantaneamente l'impatto su rischio e rendimento."
      }
    ],
    tierText: "Esclusivo Trefolio Pro",
    ctaLabel: "Apri il simulatore"
  },
  "feature-net-worth": {
    heading: "Monitoraggio patrimonio netto",
    intro: "I tuoi investimenti sono solo una parte delle tue finanze. Traccia tutto — immobili, risparmi, pensioni e altro — in un unico posto.",
    sectionLabel: "Cosa puoi tracciare:",
    features: [
      {
        title: "Immobili",
        desc: "Aggiungi proprietà con valore attuale. Aggiorna quando cambiano le condizioni di mercato."
      },
      {
        title: "Conti di risparmio",
        desc: "Traccia liquidità in banche in diverse valute."
      },
      {
        title: "Pensioni e assicurazioni",
        desc: "Includi fondi pensione e polizze assicurative sulla vita nel tuo patrimonio netto."
      },
      {
        title: "Patrimonio netto totale",
        desc: "Vedi tutto combinato: azioni + ETFs + crypto + immobili + risparmi + pensioni = la tua immagine completa."
      }
    ],
    tierText: "Bifolio: Fino a 10 attività | Trefolio: Fino a 999 attività",
    ctaLabel: "Aggiungi attività manuali"
  },
  "feature-crypto": {
    heading: "Portafoglio crypto",
    intro: "Traccia la crypto insieme alle tue azioni e ETFs. Ottieni lo stesso livello di analisi e insight per le tue posizioni crypto.",
    sectionLabel: "Cosa ottieni:",
    features: [
      {
        title: "Dashboard crypto",
        desc: "Prezzi, variazioni 24h, volume e capitalizzazione di mercato delle principali criptovalute."
      },
      {
        title: "Tracking portafoglio",
        desc: "Aggiungi posizioni crypto insieme alle azioni. Vedi valore e allocazione unificati del portafoglio."
      },
      {
        title: "Grafici e storico",
        desc: "Grafici dei prezzi con pi&ugrave; timeframe e overlay dei tassi di cambio."
      },
      {
        title: "Analisi crypto IA",
        desc: "Chiedi alla nostra IA informazioni su qualsiasi crypto — fondamentali, trend e analisi di mercato."
      }
    ],
    tierText: "Folio: Panoramica mercato | Trefolio: Tracking completo e IA",
    ctaLabel: "Esplora la crypto"
  }
};
