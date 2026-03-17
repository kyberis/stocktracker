import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Otrzymałeś ten e-mail od trefolio.",
  unsubscribeLabel: "Wypisz się"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Kursy w czasie rzeczywistym",
    intro: "Tw&oacute;j panel portfela aktualizuje ceny na żywo przez cały dzień handlowy — bez ręcznego odświeżania.",
    sectionLabel: "Co otrzymujesz:",
    features: [
      {
        title: "60+ giełd",
        desc: "Ceny z NYSE, NASDAQ, Euronext, Londyn, Frankfurt i więcej — powered by Yahoo Finance."
      },
      {
        title: "Auto-odświeżanie",
        desc: "Kursy odświeżają się co 15 sekund (konfigurowalne do 30s lub 60s w ustawieniach)."
      },
      {
        title: "Wielowalutowość",
        desc: "Zobacz wartości w swojej walucie lokalnej. Obsługujemy 21 walut z automatyczną konwersją."
      }
    ],
    tierText: "Dostępne we wszystkich planach",
    ctaLabel: "Otwórz panel"
  },
  "feature-dividend-tracking": {
    heading: "Śledzenie dywidend",
    intro: "trefolio automatycznie wykrywa dywidendy z Twoich pozycji i buduje pełny obraz dochodów.",
    sectionLabel: "Co otrzymujesz:",
    features: [
      {
        title: "Kalendarz dywidend",
        desc: "Zobacz nadchodzące płatności miesiąc po miesiącu. Wiedz dokładnie, kiedy dywidendy trafiają na Twoje konto."
      },
      {
        title: "Dochód roczny",
        desc: "Całkowity przewidywany dochód z dywidend w całym portfelu z podziałem na akcje."
      },
      {
        title: "Rentowność na koszcie",
        desc: "Śledź realną rentowność na podstawie ceny zakupu — nie tylko bieżącej stopy dywidendy."
      },
      {
        title: "Symulacja DRIP",
        desc: "Zobacz, jak reinwestycja dywidend może zwiększyć zwroty w ciągu 5, 10 lub 20 lat."
      }
    ],
    tierText: "Dostępne we wszystkich planach",
    ctaLabel: "Zobacz dywidendy"
  },
  "feature-ai-analysis": {
    heading: "Analiza akcji z wykorzystaniem IA",
    intro: "Zapytaj naszą IA o dowolną akcję w portfelu lub dowolny ticker, który rozważasz. Otrzymaj analizę na poziomie instytucjonalnym w sekundach.",
    sectionLabel: "O co możesz zapytać:",
    features: [
      {
        title: "Analiza wyników",
        desc: "\"Jak były ostatnie wyniki AAPL?\" — podsumowanie wyników, wytycznych i reakcji rynku."
      },
      {
        title: "Ocena ryzyka",
        desc: "\"Jakie są ryzyka posiadania TSLA?\" — zagrożenia konkurencyjne, wycena i czynniki makro."
      },
      {
        title: "Porównanie konkurentów",
        desc: "\"Porównaj MSFT vs GOOG\" — analiza obok siebie finansów, wzrostu i wyceny."
      },
      {
        title: "Przegląd portfela",
        desc: "\"Przejrzyj mój portfel\" — IA analizuje alokację, ryzyko i sugeruje ulepszenia."
      }
    ],
    tierText: "Folio: 5 wywołań/mies. | Bifolio: 20/mies. | Trefolio: Nielimitowane",
    ctaLabel: "Wypróbuj analizę IA teraz"
  },
  "feature-price-alerts": {
    heading: "Alerty cenowe",
    intro: "Nie przegap ważnego ruchu cenowego. Ustaw ceny docelowe i otrzymuj powiadomienia, gdy akcja przekroczy Twój próg.",
    sectionLabel: "Jak to działa:",
    features: [
      {
        title: "Alerty progowe",
        desc: "Ustaw cele cenowe \"powyżej\" lub \"poniżej\". Otrzymuj powiadomienia, gdy akcja przekroczy Twoją linię."
      },
      {
        title: "Alerty zmiany %",
        desc: "Śledź dzienne lub od zakupu zmiany procentowe. Łap spadki lub wzrosty wcześnie."
      },
      {
        title: "Wielokanałowe",
        desc: "Alerty e-mail i push na Bifolio. Dodaj WhatsApp i alerty urządzenia na Trefolio."
      },
      {
        title: "Zasilane przez cron",
        desc: "Nasz system sprawdza ceny co minutę w godzinach handlu. Nigdy nie musisz patrzeć na ekran."
      }
    ],
    tierText: "Bifolio: Do 10 alertów | Trefolio: Nieograniczone alerty",
    ctaLabel: "Utwórz pierwszy alert"
  },
  "feature-broker-import": {
    heading: "Import portfela",
    intro: "Dodajesz akcje ręcznie jedną po drugiej? Jest szybszy sposób. trefolio obsługuje trzy metody importu, aby uzyskać pełny portfel w sekundach.",
    sectionLabel: "Wybierz metodę:",
    features: [
      {
        title: "Synchronizacja z brokerem",
        desc: "Połącz konto maklerskie i automatycznie synchronizujemy pozycje, gotówkę i transakcje. Konfiguracja jednym kliknięciem, zawsze aktualna."
      },
      {
        title: "Przesyłanie CSV",
        desc: "Eksportuj CSV z brokera i prześlij. Obsługujemy 20+ formatów w tym DEGIRO, Interactive Brokers, Trade Republic i inne."
      },
      {
        title: "Import IA",
        desc: "Prześlij dowolny plik — CSV, PDF lub zrzut ekranu — a nasza IA przekształci go w portfel. Działa nawet z nietypowymi formatami."
      }
    ],
    tierText: "Folio: CSV i Ręcznie | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importuj portfel"
  },
  "feature-fundamentals": {
    heading: "Fundamenty firmy",
    intro: "Wyjd&zacute; poza ceny akcji. trefolio daje Ci dost&eacute;p do pe&lstrok;nych finans&oacute;w firmy — tych samych danych, kt&oacute;rych u&zdot;ywaj&aacute; profesjonalni analitycy.",
    sectionLabel: "Co otrzymujesz:",
    features: [
      {
        title: "Rachunek zysków i strat",
        desc: "Przychody, zysk netto, mar&zdot;e i zysk na akcj&eacute; — kwartalnie i rocznie."
      },
      {
        title: "Bilans",
        desc: "Aktywa, zobowi&aacute;zania, poziom zad&lstrok;u&zdot;enia i warto&sacute;&cacute; ksi&eacute;gowa na pierwszy rzut oka."
      },
      {
        title: "Przepływy pieniężne",
        desc: "Przepływy operacyjne, inwestycyjne i finansowe. Zobacz, czy firma generuje prawdziwą got&oacute;wk&eacute;."
      },
      {
        title: "Transakcje insider&oacute;w",
        desc: "Zobacz, co kupuj&aacute; i sprzedaj&aacute; dyrektorzy i członkowie zarz&aacute;du."
      },
      {
        title: "Udziały instytucjonalne",
        desc: "Śledź, co posiadaj&aacute; duże fundusze — Vanguard, BlackRock, Fidelity i inne."
      }
    ],
    tierText: "Ekskluzywnie Trefolio Pro",
    ctaLabel: "Poznaj fundamenty"
  },
  "feature-stock-screener": {
    heading: "Filtr akcji",
    intro: "Odkryj akcje pasuj&aacute;ce do Twoich kryteri&oacute;w inwestycyjnych. Filtruj 600+ akcji w wielu wymiarach i stosuj sprawdzone strategie.",
    sectionLabel: "Filtruj wed&lstrok;ug:",
    features: [
      {
        title: "6 wymiar&oacute;w filtra",
        desc: "Kapitalizacja rynkowa, wska&zacute;nik P/E, stopa dywidendy, sektor, kraj i gie&lstrok;da. &Lstrok;&aacute;cz dowoln&aacute; liczb&eacute;."
      },
      {
        title: "5 wbudowanych strategii",
        desc: "Inwestowanie w warto&sacute;&cacute;, wzrost dywidend, momentum, jako&sacute;&cacute; i ma&lstrok;e sp&oacute;&lstrok;ki — presety jednym klikni&eacute;ciem."
      },
      {
        title: "Bogate dane",
        desc: "Cena, zmiana %, kapitalizacja, P/E, stopa dywidendy i sektor dla ka&zdot;dego wyniku."
      },
      {
        title: "Szybkie dodawanie",
        desc: "Znalazłeś coś ciekawego? Dodaj do portfela lub listy obserwowanych bezpo&sacute;rednio z wynik&oacute;w."
      }
    ],
    tierText: "Ekskluzywnie Trefolio Pro",
    ctaLabel: "Otw&oacute;rz filtr"
  },
  "feature-tax-reports": {
    heading: "Raporty podatkowe",
    intro: "Rozliczenia podatkowe nie musz&aacute; by&cacute; bolesne. trefolio generuje raporty podatkowe specyficzne dla kraju i zawiera Asystenta Podatkowego IA do Twoich pyta&nacute;.",
    sectionLabel: "Co otrzymujesz:",
    features: [
      {
        title: "5 kraj&oacute;w UE",
        desc: "Raporty specyficzne dla kraju dla Niemiec, Francji, Hiszpanii, Holandii i W&lstrok;och."
      },
      {
        title: "Zyski i straty",
        desc: "Obliczone zyski kapita&lstrok;owe, straty i okres posiadania dla ka&zdot;dej pozycji."
      },
      {
        title: "Doch&oacute;d z dywidend",
        desc: "Dywidendy brutto, podatek u&zdot;r&oacute;d&lstrok;owy i doch&oacute;d netto wed&lstrok;ug kraju pochodzenia."
      },
      {
        title: "Asystent Podatkowy IA",
        desc: "Zadawaj pytania jak \"Ile zap&lstrok;aci&lstrok;em podatku u&zdot;r&oacute;d&lstrok;owego od dywidend ameryka&nacute;skich?\" i otrzymuj natychmiastowe odpowiedzi."
      }
    ],
    tierText: "Ekskluzywnie Trefolio Pro",
    ctaLabel: "Generuj raport podatkowy"
  },
  "feature-portfolio-simulator": {
    heading: "Symulator portfela",
    intro: "Przetestuj pomysły inwestycyjne przed zaanga&zdot;owaniem prawdziwych pieniędzy. Symulator pozwala na backtest, testy obci&aacute;&zdot;e&nacute; i eksploracj&eacute; scenariuszy what-if.",
    sectionLabel: "Trzy tryby:",
    features: [
      {
        title: "Backtest",
        desc: "Zobacz, jak portfel sprawdziłby si&eacute; historycznie. Por&oacute;wnaj z S&P 500, MSCI World lub niestandardowym benchmarkiem."
      },
      {
        title: "Testy obci&aacute;&zdot;e&nacute;",
        desc: "Co jeśli rynek spadnie o 30%? A jeśli stopy procentowe wzrosn&aacute;? Zobacz, jak portfel radzi sobie w r&oacute;&zdot;nych scenariuszach."
      },
      {
        title: "Analiza what-if",
        desc: "Dodawaj lub usuwaj pozycje, zmieniaj alokacje i natychmiast zobacz wpływ na ryzyko i zwrot."
      }
    ],
    tierText: "Ekskluzywnie Trefolio Pro",
    ctaLabel: "Otw&oacute;rz symulator"
  },
  "feature-net-worth": {
    heading: "Śledzenie wartości netto",
    intro: "Twoje inwestycje to tylko część Twoich finans&oacute;w. Śledź wszystko — nieruchomości, oszczędności, emerytury i więcej — w jednym miejscu.",
    sectionLabel: "Co możesz śledzić:",
    features: [
      {
        title: "Nieruchomości",
        desc: "Dodawaj nieruchomości z aktualną wartością. Aktualizuj, gdy zmieniają się warunki rynkowe."
      },
      {
        title: "Konta oszczędnościowe",
        desc: "Śledź gotówkę w bankach w różnych walutach."
      },
      {
        title: "Emerytury i ubezpieczenia",
        desc: "Uwzględnij fundusze emerytalne i polisy ubezpieczenia na życie w swojej wartości netto."
      },
      {
        title: "Całkowita wartość netto",
        desc: "Zobacz wszystko łącznie: akcje + ETFs + krypto + nieruchomości + oszczędności + emerytury = Twój pełny obraz."
      }
    ],
    tierText: "Bifolio: Do 10 aktywów | Trefolio: Do 999 aktywów",
    ctaLabel: "Dodaj aktywa ręcznie"
  },
  "feature-crypto": {
    heading: "Portfel krypto",
    intro: "Śledź krypto obok swoich akcji i ETF&oacute;w. Uzyskaj ten sam poziom analizy i insight&oacute;w dla swoich pozycji krypto.",
    sectionLabel: "Co otrzymujesz:",
    features: [
      {
        title: "Panel krypto",
        desc: "Ceny, zmiany 24h, wolumen i kapitalizacja rynkowa najważniejszych kryptowalut."
      },
      {
        title: "Śledzenie portfela",
        desc: "Dodawaj pozycje krypto obok akcji. Zobacz ujednolicony wartość i alokację portfela."
      },
      {
        title: "Wykresy i historia",
        desc: "Wykresy cen z wieloma ramami czasowymi i nakładkami kursów walut."
      },
      {
        title: "Analiza krypto IA",
        desc: "Zapytaj naszą IA o dowolną krypto — fundamenty, trendy i analiza rynku."
      }
    ],
    tierText: "Folio: Przegląd rynku | Trefolio: Pełne śledzenie portfela i IA",
    ctaLabel: "Poznaj krypto"
  }
};
