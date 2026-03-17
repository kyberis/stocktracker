import type { FeatureTemplateStrings, TemplateFooterStrings } from "../template-types";

export const footer: TemplateFooterStrings = {
  receivedText: "Recebeu este e-mail de trefolio.",
  unsubscribeLabel: "Cancelar subscri&ccedil;&atilde;o"
};

export const features: Record<string, FeatureTemplateStrings> = {
  "feature-real-time-quotes": {
    heading: "Cota&ccedil;&otilde;es em tempo real",
    intro: "O seu painel de portf&oacute;lio atualiza os pre&ccedil;os em tempo real durante o dia de negocia&ccedil;&atilde;o — sem necessidade de atualizar manualmente.",
    sectionLabel: "O que obt&eacute;m:",
    features: [
      {
        title: "60+ bolsas",
        desc: "Pre&ccedil;os de NYSE, NASDAQ, Euronext, Londres, Frankfurt e mais — powered by Yahoo Finance."
      },
      {
        title: "Atualiza&ccedil;&atilde;o autom&aacute;tica",
        desc: "As cota&ccedil;&otilde;es atualizam a cada 15 segundos (configur&aacute;vel para 30s ou 60s nas defini&ccedil;&otilde;es)."
      },
      {
        title: "Multi-moeda",
        desc: "Veja valores na sua moeda local. Suportamos 21 moedas com convers&atilde;o autom&aacute;tica."
      }
    ],
    tierText: "Dispon&iacute;vel em todos os planos",
    ctaLabel: "Abrir o seu painel"
  },
  "feature-dividend-tracking": {
    heading: "Acompanhamento de dividendos",
    intro: "trefolio detecta automaticamente os dividendos das suas posi&ccedil;&otilde;es e constr&oacute;i um quadro completo de rendimentos.",
    sectionLabel: "O que obt&eacute;m:",
    features: [
      {
        title: "Calend&aacute;rio de dividendos",
        desc: "Veja os pagamentos futuros m&ecirc;s a m&ecirc;s. Saiba exatamente quando os dividendos chegam &agrave; sua conta."
      },
      {
        title: "Rendimento anual",
        desc: "Rendimento total projetado de dividendos em todo o portf&oacute;lio com detalhamento por a&ccedil;&atilde;o."
      },
      {
        title: "Rendimento sobre custo",
        desc: "Acompanhe o seu rendimento real baseado no pre&ccedil;o de compra — n&atilde;o apenas a taxa atual de dividendos."
      },
      {
        title: "Simula&ccedil;&atilde;o DRIP",
        desc: "Veja como reinvestir dividendos poderia fazer crescer os seus rendimentos em 5, 10 ou 20 anos."
      }
    ],
    tierText: "Dispon&iacute;vel em todos os planos",
    ctaLabel: "Ver os seus dividendos"
  },
  "feature-ai-analysis": {
    heading: "An&aacute;lise de a&ccedil;&otilde;es com IA",
    intro: "Pergunte &agrave; nossa IA sobre qualquer a&ccedil;&atilde;o no seu portf&oacute;lio ou qualquer ticker que esteja a considerar. Obtenha an&aacute;lise de qualidade institucional em segundos.",
    sectionLabel: "O que pode perguntar:",
    features: [
      {
        title: "An&aacute;lise de resultados",
        desc: "\"Como foram os &uacute;ltimos resultados da AAPL?\" — resumo de resultados, orienta&ccedil;&atilde;o e rea&ccedil;&atilde;o do mercado."
      },
      {
        title: "Avalia&ccedil;&atilde;o de risco",
        desc: "\"Quais s&atilde;o os riscos de deter TSLA?\" — amea&ccedil;as competitivas, avalia&ccedil;&atilde;o e fatores macro."
      },
      {
        title: "Compara&ccedil;&atilde;o de concorrentes",
        desc: "\"Compare MSFT vs GOOG\" — an&aacute;lise lado a lado de finan&ccedil;as, crescimento e avalia&ccedil;&atilde;o."
      },
      {
        title: "Revis&atilde;o de portf&oacute;lio",
        desc: "\"Revise o meu portf&oacute;lio\" — a IA analisa aloca&ccedil;&atilde;o, risco e sugere melhorias."
      }
    ],
    tierText: "Folio: 5 chamadas/m&ecirc;s | Bifolio: 20/m&ecirc;s | Trefolio: Ilimitado",
    ctaLabel: "Experimentar an&aacute;lise IA agora"
  },
  "feature-price-alerts": {
    heading: "Alertas de preço",
    intro: "Nunca perca um movimento de preço importante. Defina preços-alvo e seja notificado quando uma ação cruzar o seu limiar.",
    sectionLabel: "Como funciona:",
    features: [
      {
        title: "Alertas de limiar",
        desc: "Defina objetivos de preço \"acima\" ou \"abaixo\". Seja notificado quando qualquer ação cruzar a sua linha."
      },
      {
        title: "Alertas de variação %",
        desc: "Acompanhe variações percentuais diárias ou desde a compra. Apanhe quedas ou subidas cedo."
      },
      {
        title: "Multi-canal",
        desc: "Alertas por email e push no Bifolio. Adicione WhatsApp e alertas de dispositivo no Trefolio."
      },
      {
        title: "Alimentado por cron",
        desc: "O nosso sistema verifica preços a cada minuto durante o horário de mercado. Nunca precisa de vigiar o ecrã."
      }
    ],
    tierText: "Bifolio: Até 10 alertas | Trefolio: Alertas ilimitadas",
    ctaLabel: "Criar o seu primeiro alerta"
  },
  "feature-broker-import": {
    heading: "Importa&ccedil;&atilde;o de portf&oacute;lio",
    intro: "A adicionar a&ccedil;&otilde;es manualmente uma a uma? H&aacute; uma forma mais r&aacute;pida. trefolio suporta tr&ecirc;s m&eacute;todos de importa&ccedil;&atilde;o para obter o portf&oacute;lio completo em segundos.",
    sectionLabel: "Escolha o seu m&eacute;todo:",
    features: [
      {
        title: "Sincroniza&ccedil;&atilde;o com corretora",
        desc: "Conecte a sua corretora e sincronizamos automaticamente as posi&ccedil;&otilde;es, dinheiro e transa&ccedil;&otilde;es. Configura&ccedil;&atilde;o com um clique, sempre atualizado."
      },
      {
        title: "Carregamento CSV",
        desc: "Exporte um CSV da sua corretora e carregue-o. Suportamos 20+ formatos incluindo DEGIRO, Interactive Brokers, Trade Republic e mais."
      },
      {
        title: "Importa&ccedil;&atilde;o IA",
        desc: "Carregue qualquer ficheiro — CSV, PDF ou captura — e a nossa IA ir&aacute; transform&aacute;-lo no seu portf&oacute;lio. Funciona mesmo com formatos incomuns."
      }
    ],
    tierText: "Folio: CSV e Manual | Bifolio: + Broker Sync | Trefolio: + AI Import",
    ctaLabel: "Importar o seu portf&oacute;lio"
  },
  "feature-fundamentals": {
    heading: "Fundamentais da empresa",
    intro: "V&aacute; al&eacute;m dos pre&ccedil;os. trefolio d&aacute;-lhe acesso &agrave;s finan&ccedil;as completas da empresa — os mesmos dados que os analistas profissionais usam.",
    sectionLabel: "O que obt&eacute;m:",
    features: [
      {
        title: "Demonstra&ccedil;&atilde;o de resultados",
        desc: "Receitas, lucro l&iacute;quido, margens e lucro por a&ccedil;&atilde;o — trimestral e anual."
      },
      {
        title: "Balan&ccedil;o",
        desc: "Activos, passivos, n&iacute;veis de d&iacute;vida e valor contabil&iacute;stico de relance."
      },
      {
        title: "Fluxo de caixa",
        desc: "Fluxos operacionais, de investimento e financeiros. Veja se a empresa gera caixa real."
      },
      {
        title: "Opera&ccedil;&otilde;es de insiders",
        desc: "Veja o que executivos e directores compram e vendem."
      },
      {
        title: "Participa&ccedil;&otilde;es institucionais",
        desc: "Acompanhe o que os grandes fundos possuem — Vanguard, BlackRock, Fidelity e mais."
      }
    ],
    tierText: "Exclusivo Trefolio Pro",
    ctaLabel: "Explorar fundamentais"
  },
  "feature-stock-screener": {
    heading: "Filtro de a&ccedil;&otilde;es",
    intro: "Descubra a&ccedil;&otilde;es que correspondem aos seus crit&eacute;rios de investimento. Filtre 600+ a&ccedil;&otilde;es em m&uacute;ltiplas dimens&otilde;es e aplique estrat&eacute;gias comprovadas.",
    sectionLabel: "Filtrar por:",
    features: [
      {
        title: "6 dimens&otilde;es de filtro",
        desc: "Capitaliza&ccedil;&atilde;o de mercado, r&aacute;cio P/E, rendimento de dividendos, sector, pa&iacute;s e bolsa. Combine quantas quiser."
      },
      {
        title: "5 estrat&eacute;gias integradas",
        desc: "Investimento em valor, crescimento de dividendos, momentum, qualidade e small-cap — predefini&ccedil;&otilde;es com um clique."
      },
      {
        title: "Dados ricos",
        desc: "Pre&ccedil;o, varia&ccedil;&atilde;o %, capitaliza&ccedil;&atilde;o, P/E, rendimento de dividendos e sector para cada resultado."
      },
      {
        title: "Adicionar r&aacute;pido",
        desc: "Encontrou algo interessante? Adicione ao portf&oacute;lio ou lista de acompanhamento directamente dos resultados."
      }
    ],
    tierText: "Exclusivo Trefolio Pro",
    ctaLabel: "Abrir o filtro"
  },
  "feature-tax-reports": {
    heading: "Relat&oacute;rios fiscais",
    intro: "As declara&ccedil;&otilde;es fiscais n&atilde;o t&ecirc;m de ser dolorosas. trefolio gera relat&oacute;rios fiscais por pa&iacute;s e inclui um Assistente Fiscal IA para as suas perguntas.",
    sectionLabel: "O que obt&eacute;m:",
    features: [
      {
        title: "5 pa&iacute;ses UE",
        desc: "Relat&oacute;rios espec&iacute;ficos por pa&iacute;s para Alemanha, Fran&ccedil;a, Espanha, Pa&iacute;ses Baixos e It&aacute;lia."
      },
      {
        title: "Ganhos e perdas",
        desc: "Mais-valias, menos-valias e per&iacute;odo de deten&ccedil;&atilde;o calculados para cada posi&ccedil;&atilde;o."
      },
      {
        title: "Rendimento de dividendos",
        desc: "Dividendos brutos, reten&ccedil;&atilde;o na fonte e rendimento l&iacute;quido por pa&iacute;s de origem."
      },
      {
        title: "Assistente Fiscal IA",
        desc: "Fa&ccedil;a perguntas como \"Quanto paguei de reten&ccedil;&atilde;o em dividendos americanos?\" e obtenha respostas instant&acirc;neas."
      }
    ],
    tierText: "Exclusivo Trefolio Pro",
    ctaLabel: "Gerar o seu relat&oacute;rio fiscal"
  },
  "feature-portfolio-simulator": {
    heading: "Simulador de portf&oacute;lio",
    intro: "Teste as suas ideias de investimento antes de comprometer dinheiro real. O simulador permite fazer backtest, testes de stress e explorar cen&aacute;rios what-if.",
    sectionLabel: "Tr&ecirc;s modos:",
    features: [
      {
        title: "Backtest",
        desc: "Veja como um portf&oacute;lio teria performado historicamente. Compare com S&P 500, MSCI World ou um benchmark personalizado."
      },
      {
        title: "Testes de stress",
        desc: "E se o mercado cair 30%? E se as taxas subirem? Veja como o seu portf&oacute;lio resiste em diferentes cen&aacute;rios."
      },
      {
        title: "An&aacute;lise what-if",
        desc: "Adicione ou remova posi&ccedil;&otilde;es, altere aloca&ccedil;&otilde;es e veja instantaneamente o impacto no risco e retorno."
      }
    ],
    tierText: "Exclusivo Trefolio Pro",
    ctaLabel: "Abrir o simulador"
  },
  "feature-net-worth": {
    heading: "Acompanhamento do património líquido",
    intro: "Os seus investimentos são apenas uma parte das suas finan&ccedil;as. Acompanhe tudo — imobili&aacute;rio, poupan&ccedil;as, reformas e mais — num s&oacute; lugar.",
    sectionLabel: "O que pode acompanhar:",
    features: [
      {
        title: "Imobili&aacute;rio",
        desc: "Adicione propriedades com valor actual. Actualize quando as condi&ccedil;&otilde;es de mercado mudarem."
      },
      {
        title: "Contas de poupan&ccedil;a",
        desc: "Acompanhe dinheiro em bancos em diferentes moedas."
      },
      {
        title: "Reformas e seguros",
        desc: "Inclua fundos de pens&atilde;o e ap&oacute;lices de seguro de vida no seu património l&iacute;quido."
      },
      {
        title: "Património l&iacute;quido total",
        desc: "Veja tudo combinado: a&ccedil;&otilde;es + ETFs + cripto + imobili&aacute;rio + poupan&ccedil;as + reformas = a sua imagem completa."
      }
    ],
    tierText: "Bifolio: At&eacute; 10 activos | Trefolio: At&eacute; 999 activos",
    ctaLabel: "Adicionar activos manuais"
  },
  "feature-crypto": {
    heading: "Portf&oacute;lio cripto",
    intro: "Acompanhe cripto junto com as suas a&ccedil;&otilde;es e ETFs. Obtenha o mesmo n&iacute;vel de an&aacute;lise e insights para as suas posi&ccedil;&otilde;es cripto.",
    sectionLabel: "O que obt&eacute;m:",
    features: [
      {
        title: "Painel cripto",
        desc: "Pre&ccedil;os, varia&ccedil;&otilde;es 24h, volume e capitaliza&ccedil;&atilde;o de mercado das principais criptomoedas."
      },
      {
        title: "Acompanhamento de portf&oacute;lio",
        desc: "Adicione posi&ccedil;&otilde;es cripto junto com a&ccedil;&otilde;es. Veja valor e aloca&ccedil;&atilde;o unificados do portf&oacute;lio."
      },
      {
        title: "Gr&aacute;ficos e hist&oacute;rico",
        desc: "Gr&aacute;ficos de pre&ccedil;os com m&uacute;ltiplos prazos e sobreposi&ccedil;&atilde;o de taxas de c&acirc;mbio."
      },
      {
        title: "An&aacute;lise cripto IA",
        desc: "Pergunte &agrave; nossa IA sobre qualquer cripto — fundamentais, tend&ecirc;ncias e an&aacute;lise de mercado."
      }
    ],
    tierText: "Folio: Vis&atilde;o de mercado | Trefolio: Acompanhamento completo e IA",
    ctaLabel: "Explorar cripto"
  }
};
