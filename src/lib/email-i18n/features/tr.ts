import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Bu e-postayı trefolio'dan aldınız.",
  unsubscribeLabel: "Abonelikten &ccedil;&iacute;k"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Ger&ccedil;ek zamanlı kotasyonlar",
    intro: "Portf&ouml;y panonuz işlem g&uuml;n&uuml; boyunca fiyatları canlı g&uuml;nceller — manuel yenileme gerekmez.",
    sectionLabel: "Ne elde edersiniz:",
    features: [
      {
        title: "60+ borsa",
        desc: "NYSE, NASDAQ, Euronext, Londra, Frankfurt ve daha fazlasından fiyatlar — powered by Yahoo Finance."
      },
      {
        title: "Otomatik yenileme",
        desc: "Kotasyonlar her 15 saniyede bir yenilenir (ayarlarda 30s veya 60s olarak yapılandırılabilir)."
      },
      {
        title: "&Ccedil;oklu para birimi",
        desc: "Yerel para biriminizde değerleri g&ouml;r&uuml;n. 21 para birimini otomatik d&ouml;n&uuml;ş&uuml;mle destekliyoruz."
      }
    ],
    tierText: "",
    ctaLabel: "Panoyu a&ccedil;"
  },
  "feature-dividend-tracking": {
    heading: "Temett&uuml; takibi",
    intro: "trefolio pozisyonlarınızdan temett&uuml;leri otomatik olarak tespit eder ve eksiksiz bir gelir tablosu oluşturur.",
    sectionLabel: "Ne elde edersiniz:",
    features: [
      {
        title: "Temett&uuml; takvimi",
        desc: "Yaklaşan &ouml;demeleri ay ay g&ouml;r&uuml;n. Temett&uuml;lerin hesabınıza tam olarak ne zaman yatacağını bilin."
      },
      {
        title: "Yıllık gelir",
        desc: "T&uuml;m portf&ouml;y genelinde hisse başına d&uuml;şen toplam tahmini temett&uuml; geliri."
      },
      {
        title: "Maliyet &uuml;zeri getiri",
        desc: "Satın alma fiyatına dayalı ger&ccedil;ek getirinizi takip edin — sadece mevcut temett&uuml; oranı değil."
      },
      {
        title: "DRIP sim&uuml;lasyonu",
        desc: "Temett&uuml;lerin yeniden yatırımının 5, 10 veya 20 yılda getirilerinizi nasıl artırabileceğini g&ouml;r&uuml;n."
      }
    ],
    tierText: "",
    ctaLabel: "Temett&uuml;leri g&ouml;r&uuml;nt&uuml;le"
  },
  "feature-ai-analysis": {
    heading: "AI hisse analizi",
    intro: "Portföyünüzdeki herhangi bir hisse veya düşündüğünüz herhangi bir ticker hakkında AI'mıza sorun. Saniyeler içinde kurumsal kalitede analiz alın.",
    sectionLabel: "Ne sorabilirsiniz:",
    features: [
      {
        title: "Sonuç analizi",
        desc: "\"AAPL'nin son sonuçları nasıldı?\" — sonuçlar, rehberlik ve pazar tepkisi özeti."
      },
      {
        title: "Risk değerlendirmesi",
        desc: "\"TSLA tutmanın riskleri nelerdir?\" — rekabet tehditleri, değerleme ve makro faktörler."
      },
      {
        title: "Rakip karşılaştırması",
        desc: "\"MSFT vs GOOG karşılaştır\" — finans, büyüme ve değerleme yan yana analizi."
      },
      {
        title: "Portföy incelemesi",
        desc: "\"Portföyümü incele\" — AI tahsisinizi, riskinizi analiz eder ve iyileştirmeler önerir."
      }
    ],
    tierText: "",
    ctaLabel: "AI analizini şimdi deneyin"
  },
  "feature-price-alerts": {
    heading: "Fiyat uyarıları",
    intro: "Önemli bir fiyat hareketini asla kaçırmayın. Hedef fiyatlar belirleyin ve bir hisse eşiğinizi geçtiği anda bildirim alın.",
    sectionLabel: "Nasıl çalışır:",
    features: [
      {
        title: "Eşik uyarıları",
        desc: "\"Üst\" veya \"alt\" fiyat hedefleri belirleyin. Bir hisse çizginizi geçtiğinde bildirim alın."
      },
      {
        title: "Yüzde değişim uyarıları",
        desc: "Günlük veya satın alma sonrası yüzde değişimleri takip edin. Düşüş veya yükselişleri erken yakalayın."
      },
      {
        title: "Çok kanallı",
        desc: "trefolio'da e-posta ve push uyarıları. trefolio'da WhatsApp ve cihaz uyarıları ekleyin."
      },
      {
        title: "Cron destekli",
        desc: "Sistemimiz piyasa saatlerinde her dakika fiyatları kontrol eder. Ekranı izlemenize hiç gerek yok."
      }
    ],
    tierText: "",
    ctaLabel: "İlk uyarınızı oluşturun"
  },
  "feature-broker-import": {
    heading: "Portföy içe aktarma",
    intro: "Hisse senetlerini tek tek manuel mi ekliyorsunuz? Daha hızlı bir yol var. trefolio tam portföyünüzü saniyeler içinde almak için üç içe aktarma yöntemini destekler.",
    sectionLabel: "Yönteminizi seçin:",
    features: [
      {
        title: "Broker senkronizasyonu",
        desc: "Brokerinizi bağlayın ve pozisyonlarınızı, nakitinizi ve işlemlerinizi otomatik senkronize ediyoruz. Tek tıkla kurulum, her zaman güncel."
      },
      {
        title: "CSV yükleme",
        desc: "Brokerinizden CSV dışa aktarın ve yükleyin. DEGIRO, Interactive Brokers, Trade Republic ve daha fazlası dahil 20+ broker formatını destekliyoruz."
      },
      {
        title: "AI içe aktarma",
        desc: "Herhangi bir dosya yükleyin — CSV, PDF veya ekran görüntüsü — ve AI'mız onu portföyünüze dönüştürecek. Alışılmadık formatlarla bile çalışır."
      }
    ],
    tierText: "",
    ctaLabel: "Portföyünüzü içe aktarın"
  },
  "feature-fundamentals": {
    heading: "Şirket temel verileri",
    intro: "Hisse fiyatlarının &ouml;tesine ge&ccedil;in. trefolio size tam &ccedil;alışma finansallarına erişim sağlar — profesyonel analistlerin kullandığı aynı veriler.",
    sectionLabel: "Ne elde edersiniz:",
    features: [
      {
        title: "Gelir tablosu",
        desc: "Gelir, net gelir, marjlar ve hisse başına kazan&ccedil; — &ccedil;eyreklik ve yıllık."
      },
      {
        title: "Bilan&ccedil;o",
        desc: "Varlıklar, y&uuml;k&uuml;ml&uuml;l&uuml;kler, bor&ccedil; seviyeleri ve defter değeri bir bakışta."
      },
      {
        title: "Nakit akışı",
        desc: "İşletme, yatırım ve finansman akışları. Şirketin ger&ccedil;ek nakit &uuml;retip &uuml;retmediğini g&ouml;r&uuml;n."
      },
      {
        title: "İ&ccedil;eriden bilgiyle işlemler",
        desc: "Y&ouml;neticilerin ve y&ouml;netim kurulu &uuml;yelerinin ne alıp sattığını g&ouml;r&uuml;n."
      },
      {
        title: "Kurumsal paylar",
        desc: "B&uuml;y&uuml;k fonların neye sahip olduğunu takip edin — Vanguard, BlackRock, Fidelity ve daha fazlası."
      }
    ],
    tierText: "",
    ctaLabel: "Temel verileri keşfedin"
  },
  "feature-stock-screener": {
    heading: "Hisse filtresi",
    intro: "Yatırım kriterlerinize uyan hisseleri ke&scedil;fedin. 600+ hisseyi birden fazla boyutta filtreleyin ve kanıtlanmış stratejiler uygulayın.",
    sectionLabel: "Filtrele:",
    features: [
      {
        title: "6 filtre boyutu",
        desc: "Piyasa değeri, P/E oranı, temettü getirisi, sektör, ülke ve borsa. İstediğiniz kadar birleştirin."
      },
      {
        title: "5 yerleşik strateji",
        desc: "Değer yatırımı, temettü büyümesi, momentum, kalite ve küçük şirketler — tek tıkla ön ayarlar."
      },
      {
        title: "Zengin veriler",
        desc: "Fiyat, değişim %, piyasa değeri, P/E, temettü getirisi ve sektör her sonuç için."
      },
      {
        title: "Hızlı ekleme",
        desc: "İlginç bir şey mi buldunuz? Portföyünüze veya izleme listenize doğrudan sonuçlardan ekleyin."
      }
    ],
    tierText: "",
    ctaLabel: "Filtreyi aç"
  },
  "feature-tax-reports": {
    heading: "Vergi raporları",
    intro: "Vergi beyannameleri acı verici olmak zorunda değil. trefolio ülkeye özel vergi raporları oluşturur ve sorularınız için bir AI Vergi Asistanı içerir.",
    sectionLabel: "Ne elde edersiniz:",
    features: [
      {
        title: "5 AB ülkesi",
        desc: "Almanya, Fransa, İspanya, Hollanda ve İtalya için ülkeye özel raporlar."
      },
      {
        title: "Kazançlar ve kayıplar",
        desc: "Her pozisyon için hesaplanan sermaye kazançları, kayıplar ve elde tutma süresi."
      },
      {
        title: "Temettü geliri",
        desc: "Brüt temettüler, kaynak vergisi ve menşe ülkesine göre net gelir."
      },
      {
        title: "AI Vergi Asistanı",
        desc: "\"ABD temettülerinde ne kadar kaynak vergisi ödedim?\" gibi sorular sorun ve anında yanıtlar alın."
      }
    ],
    tierText: "",
    ctaLabel: "Vergi raporunuzu oluşturun"
  },
  "feature-portfolio-simulator": {
    heading: "Portföy simülatörü",
    intro: "Gerçek para taahhüt etmeden önce yatırım fikirlerinizi test edin. Simülatör backtest, stres testi yapmanıza ve what-if senaryolarını keşfetmenize olanak tanır.",
    sectionLabel: "Üç mod:",
    features: [
      {
        title: "Backtest",
        desc: "Bir portföyün tarihsel olarak nasıl performans göstereceğini görün. S&P 500, MSCI World veya özel bir kıyaslama ile karşılaştırın."
      },
      {
        title: "Stres testi",
        desc: "Piyasa %30 düşerse ne olur? Faiz oranları yükselirse? Portföyünüzün farklı senaryolarda nasıl dayandığını görün."
      },
      {
        title: "What-if analizi",
        desc: "Pozisyon ekleyin veya çıkarın, tahsisleri değiştirin ve risk ve getiri üzerindeki etkiyi anında görün."
      }
    ],
    tierText: "",
    ctaLabel: "Simülatörü aç"
  },
  "feature-net-worth": {
    heading: "Net değer takibi",
    intro: "Yatırımlarınız finanslarınızın sadece bir parçası. Her şeyi takip edin — gayrimenkul, tasarruflar, emeklilikler ve daha fazlası — tek bir yerde.",
    sectionLabel: "Neleri takip edebilirsiniz:",
    features: [
      {
        title: "Gayrimenkul",
        desc: "Güncel değerle mülk ekleyin. Piyasa koşulları değiştiğinde güncelleyin."
      },
      {
        title: "Tasarruf hesapları",
        desc: "Farklı para birimlerinde bankalardaki nakit takibini yapın."
      },
      {
        title: "Emeklilik ve sigorta",
        desc: "Emeklilik fonları ve hayat sigortası poliçelerini net değerinize dahil edin."
      },
      {
        title: "Toplam net değer",
        desc: "Her şeyi birleşik görün: hisse senetleri + ETFs + kripto + gayrimenkul + tasarruflar + emeklilikler = tam resminiz."
      }
    ],
    tierText: "",
    ctaLabel: "Manuel varlık ekle"
  },
  "feature-crypto": {
    heading: "Kripto portföy",
    intro: "Hisse senetleriniz ve ETF'lerinizle birlikte kripto takip edin. Kripto pozisyonlarınız için aynı analiz ve içgörü seviyesini alın.",
    sectionLabel: "Ne elde edersiniz:",
    features: [
      {
        title: "Kripto paneli",
        desc: "Önde gelen kripto paralar için fiyatlar, 24s değişimler, hacim ve piyasa değeri."
      },
      {
        title: "Portföy takibi",
        desc: "Hisse senetlerinin yanına kripto pozisyonları ekleyin. Birleşik portföy değerini ve tahsisini görün."
      },
      {
        title: "Grafikler ve geçmiş",
        desc: "Birden fazla zaman dilimi ve döviz kuru katmanlarıyla fiyat grafikleri."
      },
      {
        title: "AI Kripto analizi",
        desc: "Herhangi bir kripto hakkında IA'mıza sorun — temeller, trendler ve piyasa analizi."
      }
    ],
    tierText: "",
    ctaLabel: "Kriptoyu keşfedin"
  }
};
