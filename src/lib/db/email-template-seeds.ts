/**
 * Seed data for email templates.
 * Called from migration 52 to populate the email_templates table.
 * All templates are editable from the admin UI after seeding.
 */

interface TemplateSeed {
  slug: string;
  name: string;
  subject: string;
  subjectEs: string;
  bodyHtml: string;
  bodyHtmlEs: string;
  bodyText: string;
  bodyTextEs: string;
  category: string;
  experienceLevel: string;
}

/* ── Shared HTML helpers (mirror email.ts patterns) ── */

const HEADER = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px 32px 28px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="width:36px;height:36px;vertical-align:middle;">
                <img src="{{base_url}}/email-logo@2x.png" alt="" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:8px;" />
              </td>
              <td style="padding-left:10px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">trefolio</td>
            </tr>
          </table>
        </td></tr>`;

function headerWithBadge(badge: string) {
  return HEADER.replace("</table>\n        </td></tr>",
    `</table>
          <p style="margin:12px 0 0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">${badge}</p>
        </td></tr>`);
}

const FOOTER = `        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
            You received this email from trefolio. <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
        &copy; 2026 trefolio &mdash; Every portfolio deserves a bit of luck &#x1F340;
      </p>
    </td></tr>
  </table>
</body>
</html>`;

const FOOTER_ES = FOOTER
  .replace("You received this email from trefolio.", "Recibiste este email de trefolio.")
  .replace("Unsubscribe", "Cancelar suscripci&oacute;n");

function cta(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:#10b981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">${label}</a>
            </td></tr>
          </table>`;
}

function ctaSecondary(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;">
            <tr><td align="center">
              <a href="${url}" target="_blank" style="display:inline-block;padding:10px 24px;background-color:transparent;color:#10b981;font-size:14px;font-weight:600;text-decoration:none;border:1.5px solid #10b981;border-radius:10px;">${label}</a>
            </td></tr>
          </table>`;
}

function feature(emoji: string, title: string, desc: string, hasBorder = false): string {
  const border = hasBorder ? "border-left:4px solid #10b981;" : "";
  return `<tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:10px;${border}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="width:36px;font-size:20px;vertical-align:top;padding-top:2px;">${emoji}</td>
                <td style="padding-left:8px;">
                  <strong style="color:#0f172a;font-size:14px;">${title}</strong>
                  <p style="margin:2px 0 0;font-size:13px;color:#475569;line-height:1.4;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>`;
}

function tierBadge(tier: string, color: string): string {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${color};color:#fff;text-transform:uppercase;letter-spacing:0.5px;">${tier}</span>`;
}

const FREE_BADGE = tierBadge("Folio", "#64748b");
const BIFOLIO_BADGE = tierBadge("Bifolio", "#3b82f6");
const TREFOLIO_BADGE = tierBadge("Trefolio", "#10b981");

function featureWithTier(emoji: string, title: string, desc: string, badge: string): string {
  return `<tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="width:36px;font-size:20px;vertical-align:top;padding-top:2px;">${emoji}</td>
                <td style="padding-left:8px;">
                  <strong style="color:#0f172a;font-size:14px;">${title}</strong> ${badge}
                  <p style="margin:4px 0 0;font-size:13px;color:#475569;line-height:1.4;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>`;
}

function proFeatureGroup(label: string, items: string[]): string {
  const checks = items.map((i) => `&#x2705; ${i}`).join("<br>");
  return `<tr><td style="padding:4px 0 6px;"><p style="margin:0;font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">${label}</p></td></tr>
          <tr><td style="padding:10px 16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #10b981;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:13px;color:#0f172a;line-height:1.7;">${checks}</td></tr></table>
          </td></tr>
          <tr><td style="height:12px;"></td></tr>`;
}

function voucherBox(code: string, discount: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="padding:20px 24px;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:12px;border:2px dashed #f59e0b;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:1px;">Exclusive offer</p>
              <p style="margin:0 0 8px;font-size:28px;font-weight:800;color:#92400e;letter-spacing:-0.5px;">${discount} OFF</p>
              <p style="margin:0 0 4px;font-size:14px;color:#78350f;">Use code at checkout:</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:2px;font-family:monospace;">${code}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#92400e;">Valid on Bifolio &amp; Trefolio &mdash; monthly or annual</p>
            </td></tr>
          </table>`;
}

function voucherBoxEs(code: string, discount: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="padding:20px 24px;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:12px;border:2px dashed #f59e0b;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:1px;">Oferta exclusiva</p>
              <p style="margin:0 0 8px;font-size:28px;font-weight:800;color:#92400e;letter-spacing:-0.5px;">${discount} DTO</p>
              <p style="margin:0 0 4px;font-size:14px;color:#78350f;">Usa este c&oacute;digo al pagar:</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:2px;font-family:monospace;">${code}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#92400e;">V&aacute;lido en Bifolio y Trefolio &mdash; mensual o anual</p>
            </td></tr>
          </table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 24px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">${text}</p>`;
}

function intro(text: string): string {
  return `<p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${text}</p>`;
}

function tip(text: string): string {
  return `<tr><td style="padding:0 32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
            <p style="margin:0;font-size:13px;color:#1e40af;text-align:center;line-height:1.5;">${text}</p>
          </td></tr></table>
        </td></tr>`;
}

function upsellTip(text: string): string {
  return `<tr><td style="padding:0 32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 16px;background:#fefce8;border-radius:10px;border:1px solid #fde68a;">
            <p style="margin:0;font-size:13px;color:#92400e;text-align:center;line-height:1.5;">${text}</p>
          </td></tr></table>
        </td></tr>`;
}

function divider(): string {
  return `<tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;margin:24px 0;"></div></td></tr>`;
}

/* ── 1. Welcome — No Stocks ── */

const welcomeNoStocksHtml = `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          ${heading("Welcome to trefolio!")}
          ${paragraph("Your account is ready. trefolio is the extra leaf for your portfolio &mdash; everything you need to track, understand, and grow your investments in one place.")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureWithTier("&#x1F4C8;", "Real-time Quotes", "Live prices from Yahoo Finance across 60+ global exchanges. See your portfolio value update throughout the day.", FREE_BADGE)}
            ${featureWithTier("&#x1F4B0;", "Dividend Tracking", "Automatic dividend detection, annual income projections, yield-on-cost, and monthly payment calendar.", FREE_BADGE)}
            ${featureWithTier("&#x1F916;", "AI-Powered Analysis", "Ask our AI about any stock &mdash; get earnings analysis, competitor comparisons, and risk assessments. 5 free calls/month.", FREE_BADGE)}
            ${featureWithTier("&#x1F4E5;", "Easy Import", "Bring your portfolio from 20+ brokers via CSV upload, one-click Broker Sync, or AI-assisted import.", FREE_BADGE)}
            ${featureWithTier("&#x1F514;", "Price Alerts", "Get notified when stocks hit your target price. Email and push alerts available on Bifolio.", BIFOLIO_BADGE)}
            ${featureWithTier("&#x1F4CA;", "Advanced Metrics", "Sharpe ratio, max drawdown, volatility, and full performance history to measure your strategy.", BIFOLIO_BADGE)}
            ${featureWithTier("&#x1F3E6;", "Fundamentals &amp; Intelligence", "Company financials, insider trades, institutional holdings, and news sentiment &mdash; all in one view.", TREFOLIO_BADGE)}
            ${featureWithTier("&#x1F50D;", "Stock Screener", "Screen 600+ stocks with 6 filters and 5 built-in strategies to discover new opportunities.", TREFOLIO_BADGE)}
          </table>
          ${cta("Add Your First Stock", "{{base_url}}/import?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_no_stocks")}
          ${ctaSecondary("Explore the Dashboard", "{{base_url}}/?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_no_stocks")}
        </td></tr>
        ${divider()}
        ${tip("&#x1F4A1; <strong>Getting started is easy:</strong> Add just one stock to see your dashboard come alive with real-time data, charts, and AI insights.")}
${FOOTER}`;

const welcomeNoStocksHtmlEs = `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          ${heading("&iexcl;Bienvenido a trefolio!")}
          ${paragraph("Tu cuenta est&aacute; lista. trefolio es la hoja extra para tu cartera &mdash; todo lo que necesitas para seguir, entender y hacer crecer tus inversiones en un solo lugar.")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureWithTier("&#x1F4C8;", "Cotizaciones en Tiempo Real", "Precios en vivo de Yahoo Finance en m&aacute;s de 60 bolsas mundiales. Mira c&oacute;mo se actualiza tu cartera durante el d&iacute;a.", FREE_BADGE)}
            ${featureWithTier("&#x1F4B0;", "Seguimiento de Dividendos", "Detecci&oacute;n autom&aacute;tica de dividendos, proyecciones de ingresos anuales, rendimiento sobre coste y calendario mensual.", FREE_BADGE)}
            ${featureWithTier("&#x1F916;", "An&aacute;lisis con IA", "Pregunta a nuestra IA sobre cualquier acci&oacute;n &mdash; an&aacute;lisis de resultados, comparaci&oacute;n con competidores y evaluaci&oacute;n de riesgos. 5 consultas gratis/mes.", FREE_BADGE)}
            ${featureWithTier("&#x1F4E5;", "Importaci&oacute;n F&aacute;cil", "Trae tu cartera de 20+ br&oacute;kers v&iacute;a CSV, sincronizaci&oacute;n autom&aacute;tica o importaci&oacute;n asistida por IA.", FREE_BADGE)}
            ${featureWithTier("&#x1F514;", "Alertas de Precio", "Recibe avisos cuando las acciones alcancen tu precio objetivo. Alertas por email y push en Bifolio.", BIFOLIO_BADGE)}
            ${featureWithTier("&#x1F4CA;", "M&eacute;tricas Avanzadas", "Ratio Sharpe, drawdown m&aacute;ximo, volatilidad e historial completo de rendimiento.", BIFOLIO_BADGE)}
            ${featureWithTier("&#x1F3E6;", "Fundamentales e Inteligencia", "Finanzas de empresas, operaciones de insiders, posiciones institucionales y sentimiento de noticias.", TREFOLIO_BADGE)}
            ${featureWithTier("&#x1F50D;", "Buscador de Acciones", "Filtra m&aacute;s de 600 acciones con 6 filtros y 5 estrategias integradas para descubrir oportunidades.", TREFOLIO_BADGE)}
          </table>
          ${cta("A&ntilde;ade Tu Primera Acci&oacute;n", "{{base_url}}/import?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_no_stocks")}
          ${ctaSecondary("Explorar el Dashboard", "{{base_url}}/?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_no_stocks")}
        </td></tr>
        ${divider()}
        ${tip("&#x1F4A1; <strong>Empezar es f&aacute;cil:</strong> A&ntilde;ade solo una acci&oacute;n para ver tu dashboard cobrar vida con datos en tiempo real, gr&aacute;ficos e insights de IA.")}
${FOOTER_ES}`;

/* ── 2. Welcome — Free with Stocks + Voucher ── */

const welcomeFreeStocksHtml = `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          ${heading("You're off to a great start!")}
          ${intro("You&rsquo;ve added your first stocks &mdash; your portfolio dashboard is now tracking your investments in real time. Here&rsquo;s what trefolio can do for you:")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${featureWithTier("&#x1F4C8;", "Real-time Dashboard", "Your portfolio value, daily changes, allocation breakdown, and performance charts &mdash; all updating live.", FREE_BADGE)}
            ${featureWithTier("&#x1F4B0;", "Dividend Insights", "Annual income projections, yield tracking, and a monthly dividend calendar for your holdings.", FREE_BADGE)}
            ${featureWithTier("&#x1F916;", "AI Stock Analysis", "Ask our AI anything about your stocks. Get earnings analysis, risk assessments, and competitive insights.", FREE_BADGE)}
            ${featureWithTier("&#x1F514;", "Price Alerts", "Never miss a price movement. Set alerts and get notified by email or push notification.", BIFOLIO_BADGE)}
            ${featureWithTier("&#x1F4CA;", "Performance Metrics", "Sharpe ratio, max drawdown, TTWROR, and full portfolio growth history over any time period.", BIFOLIO_BADGE)}
            ${featureWithTier("&#x1F3E6;", "Company Fundamentals", "Income statements, balance sheets, cash flow, insider trades, and institutional holdings.", TREFOLIO_BADGE)}
            ${featureWithTier("&#x1F50D;", "Stock Screener &amp; Simulator", "Screen 600+ stocks and backtest portfolio strategies with our what-if simulator.", TREFOLIO_BADGE)}
          </table>
          ${voucherBox("EARLYBIRD", "75%")}
          ${cta("Upgrade Now &mdash; 75% Off", "{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_free_stocks")}
          ${ctaSecondary("Continue with Folio", "{{base_url}}/?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_free_stocks")}
        </td></tr>
        ${divider()}
        ${tip("&#x1F4A1; <strong>Your Folio plan</strong> includes up to 15 holdings, 1 portfolio, and 5 AI calls/month. Upgrade to unlock more.")}
${FOOTER}`;

const welcomeFreeStocksHtmlEs = `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          ${heading("&iexcl;Has empezado genial!")}
          ${intro("Has a&ntilde;adido tus primeras acciones &mdash; tu dashboard ahora est&aacute; siguiendo tus inversiones en tiempo real. Esto es lo que trefolio puede hacer por ti:")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${featureWithTier("&#x1F4C8;", "Dashboard en Tiempo Real", "Valor de tu cartera, cambios diarios, distribuci&oacute;n de activos y gr&aacute;ficos de rendimiento &mdash; todo actualiz&aacute;ndose en vivo.", FREE_BADGE)}
            ${featureWithTier("&#x1F4B0;", "Insights de Dividendos", "Proyecciones de ingresos anuales, seguimiento de rendimiento y calendario mensual de dividendos.", FREE_BADGE)}
            ${featureWithTier("&#x1F916;", "An&aacute;lisis IA", "Pregunta a nuestra IA lo que quieras sobre tus acciones. An&aacute;lisis de resultados, evaluaci&oacute;n de riesgos y comparativas.", FREE_BADGE)}
            ${featureWithTier("&#x1F514;", "Alertas de Precio", "No te pierdas ning&uacute;n movimiento. Configura alertas y recibe notificaciones por email o push.", BIFOLIO_BADGE)}
            ${featureWithTier("&#x1F4CA;", "M&eacute;tricas de Rendimiento", "Ratio Sharpe, drawdown m&aacute;ximo, TTWROR e historial completo de crecimiento.", BIFOLIO_BADGE)}
            ${featureWithTier("&#x1F3E6;", "Fundamentales de Empresa", "Cuenta de resultados, balance, flujo de caja, operaciones de insiders y posiciones institucionales.", TREFOLIO_BADGE)}
            ${featureWithTier("&#x1F50D;", "Buscador y Simulador", "Filtra 600+ acciones y simula estrategias con nuestro simulador what-if.", TREFOLIO_BADGE)}
          </table>
          ${voucherBoxEs("EARLYBIRD", "75%")}
          ${cta("Mejora Ahora &mdash; 75% Dto", "{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_free_stocks")}
          ${ctaSecondary("Continuar con Folio", "{{base_url}}/?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_free_stocks")}
        </td></tr>
        ${divider()}
        ${tip("&#x1F4A1; <strong>Tu plan Folio</strong> incluye hasta 15 posiciones, 1 cartera y 5 consultas IA/mes. Mejora para desbloquear m&aacute;s.")}
${FOOTER_ES}`;

/* ── 3. Bifolio Upgrade ── */

const bifolioUpgradeHtml = `${headerWithBadge("Bifolio")}
        <tr><td style="padding:36px 32px 16px;">
          ${heading("Welcome to Bifolio!")}
          ${paragraph("Your upgrade is active. Here&rsquo;s everything you just unlocked:")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F517;", "Portfolio Sharing", "Generate a public link to share your portfolio performance with anyone &mdash; friends, family, or your community.", true)}
            ${feature("&#x1F4CA;", "CSV Export", "Download your holdings and transactions as CSV files for your own analysis or tax records.", true)}
            ${feature("&#x1F514;", "Email &amp; Push Alerts", "Set up to 10 price alerts. Get notified instantly by email or browser push when stocks hit your targets.", true)}
            ${feature("&#x1F4C8;", "Advanced Metrics", "Sharpe ratio, max drawdown, and volatility &mdash; the metrics serious investors rely on.", true)}
            ${feature("&#x1F4B0;", "Full Growth History", "See your complete portfolio performance over any time period with detailed charts.", true)}
            ${feature("&#x1F3E0;", "Net Worth Tracking", "Track real estate, savings accounts, pensions &mdash; up to 10 manual assets for a complete financial picture.", true)}
            ${feature("&#x1F4E5;", "Broker Sync", "Connect your brokerage for one-click auto-sync of holdings, cash, and transactions.", true)}
            ${feature("&#x1F916;", "20 AI Calls/Month", "4x more AI analysis calls to understand your holdings, compare stocks, and get portfolio reviews.", true)}
            ${feature("&#x1F4AC;", "AI Support Agent", "Get instant help from our AI-powered support chat &mdash; available 24/7.", true)}
          </table>
          ${cta("Set Up Your First Alert", "{{base_url}}/tools/alerts?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade")}
          ${ctaSecondary("Share Your Portfolio", "{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade")}
        </td></tr>
        ${divider()}
        ${upsellTip("<strong>Want even more?</strong> Trefolio unlocks company fundamentals, stock screener, tax reports, WhatsApp alerts, and unlimited holdings. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Learn more</a>")}
${FOOTER}`;

const bifolioUpgradeHtmlEs = `${headerWithBadge("Bifolio")}
        <tr><td style="padding:36px 32px 16px;">
          ${heading("&iexcl;Bienvenido a Bifolio!")}
          ${paragraph("Tu mejora est&aacute; activa. Esto es todo lo que has desbloqueado:")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F517;", "Compartir Cartera", "Genera un enlace p&uacute;blico para compartir el rendimiento de tu cartera con quien quieras.", true)}
            ${feature("&#x1F4CA;", "Exportar CSV", "Descarga tus posiciones y transacciones en CSV para tu propio an&aacute;lisis o declaraci&oacute;n fiscal.", true)}
            ${feature("&#x1F514;", "Alertas Email y Push", "Configura hasta 10 alertas de precio. Recibe notificaciones instant&aacute;neas por email o push.", true)}
            ${feature("&#x1F4C8;", "M&eacute;tricas Avanzadas", "Ratio Sharpe, drawdown m&aacute;ximo y volatilidad &mdash; las m&eacute;tricas que usan los inversores serios.", true)}
            ${feature("&#x1F4B0;", "Historial Completo", "Visualiza el rendimiento completo de tu cartera en cualquier periodo con gr&aacute;ficos detallados.", true)}
            ${feature("&#x1F3E0;", "Patrimonio Neto", "Registra inmuebles, cuentas de ahorro, pensiones &mdash; hasta 10 activos manuales.", true)}
            ${feature("&#x1F4E5;", "Sincronizaci&oacute;n de Broker", "Conecta tu br&oacute;ker para sincronizar posiciones, efectivo y transacciones autom&aacute;ticamente.", true)}
            ${feature("&#x1F916;", "20 Consultas IA/Mes", "4x m&aacute;s consultas de IA para analizar tus posiciones y obtener revisiones de cartera.", true)}
            ${feature("&#x1F4AC;", "Agente de Soporte IA", "Obtén ayuda instant&aacute;nea de nuestro chat de soporte con IA &mdash; disponible 24/7.", true)}
          </table>
          ${cta("Configura Tu Primera Alerta", "{{base_url}}/tools/alerts?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade")}
          ${ctaSecondary("Compartir Cartera", "{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade")}
        </td></tr>
        ${divider()}
        ${upsellTip("<strong>&iquest;Quieres m&aacute;s?</strong> Trefolio desbloquea fundamentales, buscador de acciones, informes fiscales, alertas WhatsApp y posiciones ilimitadas. <a href=\"{{base_url}}/profile?utm_source=email&utm_medium=lifecycle&utm_campaign=bifolio_upgrade\" style=\"color:#b45309;text-decoration:underline;font-weight:600;\">Saber m&aacute;s</a>")}
${FOOTER_ES}`;

/* ── 4. Trefolio Upgrade ── */

const trefolioUpgradeHtml = `${headerWithBadge("&#x2B50; Trefolio Pro &#x2B50;")}
        <tr><td style="padding:36px 32px 16px;">
          ${heading("Welcome to Trefolio Pro!")}
          ${paragraph("You now have full access to every feature trefolio offers. Here&rsquo;s your complete toolkit:")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${proFeatureGroup("Data &amp; Analysis", ["Alpha Vantage premium data", "Company fundamentals: income, balance sheet, cash flow", "Economic indicators dashboard"])}
            ${proFeatureGroup("Intelligence", ["News feed with sentiment analysis", "Insider trades &amp; institutional holdings", "AI analysis: 30 calls/day, unlimited monthly"])}
            ${proFeatureGroup("Advanced Tools", ["Sharpe ratio, max drawdown, volatility metrics", "Full portfolio performance history", "Stock screener: 600+ stocks, 6 filters, 5 strategies"])}
            ${proFeatureGroup("Crypto Pro", ["Crypto charts, exchange rates, AI analysis", "Dedicated crypto portfolio tab"])}
            ${proFeatureGroup("Tax &amp; Planning", ["EU tax reports (DE, FR, ES, NL, IT) with AI Tax Assistant", "Portfolio simulator: backtest, what-if, stress testing", "Financial planning: FIRE, retirement projections"])}
            ${proFeatureGroup("Alerts &amp; Limits", ["WhatsApp &amp; device notifications", "Unlimited price alerts &amp; holdings", "Up to 5 portfolios", "999 manual assets for full net worth tracking"])}
          </table>
          <div style="height:12px;"></div>
          ${cta("Explore AI Insights", "{{base_url}}/?utm_source=email&utm_medium=lifecycle&utm_campaign=trefolio_upgrade")}
          ${ctaSecondary("View Fundamentals", "{{base_url}}/?utm_source=email&utm_medium=lifecycle&utm_campaign=trefolio_upgrade")}
        </td></tr>
        ${divider()}
        ${tip("&#x1F31F; <strong>You&rsquo;re one of our first 500 Pro members.</strong> Thank you for believing in trefolio. Your feedback shapes what we build next.")}
${FOOTER}`;

const trefolioUpgradeHtmlEs = `${headerWithBadge("&#x2B50; Trefolio Pro &#x2B50;")}
        <tr><td style="padding:36px 32px 16px;">
          ${heading("&iexcl;Bienvenido a Trefolio Pro!")}
          ${paragraph("Ahora tienes acceso completo a todas las funciones de trefolio. Aqu&iacute; tienes tu kit completo:")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${proFeatureGroup("Datos y An&aacute;lisis", ["Datos premium de Alpha Vantage", "Fundamentales: cuenta de resultados, balance, flujo de caja", "Panel de indicadores econ&oacute;micos"])}
            ${proFeatureGroup("Inteligencia", ["Noticias con an&aacute;lisis de sentimiento", "Operaciones de insiders y posiciones institucionales", "An&aacute;lisis IA: 30 consultas/d&iacute;a, ilimitado mensual"])}
            ${proFeatureGroup("Herramientas Avanzadas", ["Ratio Sharpe, drawdown m&aacute;ximo, m&eacute;tricas de volatilidad", "Historial completo de rendimiento", "Buscador: 600+ acciones, 6 filtros, 5 estrategias"])}
            ${proFeatureGroup("Crypto Pro", ["Gr&aacute;ficos crypto, tipos de cambio, an&aacute;lisis IA", "Pesta&ntilde;a dedicada de cartera crypto"])}
            ${proFeatureGroup("Fiscal y Planificaci&oacute;n", ["Informes fiscales EU (DE, FR, ES, NL, IT) con Asistente Fiscal IA", "Simulador: backtesting, what-if, pruebas de estr&eacute;s", "Planificaci&oacute;n financiera: FIRE, proyecciones de jubilaci&oacute;n"])}
            ${proFeatureGroup("Alertas y L&iacute;mites", ["Notificaciones WhatsApp y dispositivo", "Alertas y posiciones ilimitadas", "Hasta 5 carteras", "999 activos manuales para patrimonio neto completo"])}
          </table>
          <div style="height:12px;"></div>
          ${cta("Explorar IA Insights", "{{base_url}}/?utm_source=email&utm_medium=lifecycle&utm_campaign=trefolio_upgrade")}
          ${ctaSecondary("Ver Fundamentales", "{{base_url}}/?utm_source=email&utm_medium=lifecycle&utm_campaign=trefolio_upgrade")}
        </td></tr>
        ${divider()}
        ${tip("&#x1F31F; <strong>Eres uno de nuestros primeros 500 miembros Pro.</strong> Gracias por creer en trefolio. Tu feedback da forma a lo que construimos.")}
${FOOTER_ES}`;

/* ── 5. Feature emails ── */

function featureEmail(title: string, emoji: string, bodyContent: string): string {
  return `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          <p style="margin:0 0 8px;font-size:36px;text-align:center;">${emoji}</p>
          ${heading(title)}
          <div style="margin-top:20px;">
            ${bodyContent}
          </div>
        </td></tr>
        ${divider()}
${FOOTER}`;
}

function featureEmailEs(title: string, emoji: string, bodyContent: string): string {
  return `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          <p style="margin:0 0 8px;font-size:36px;text-align:center;">${emoji}</p>
          ${heading(title)}
          <div style="margin-top:20px;">
            ${bodyContent}
          </div>
        </td></tr>
        ${divider()}
${FOOTER_ES}`;
}

const featureTemplates: TemplateSeed[] = [
  {
    slug: "feature-real-time-quotes",
    name: "Feature: Real-time Quotes",
    subject: "Track every price movement in real time",
    subjectEs: "Sigue cada movimiento de precio en tiempo real",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Real-time Quotes", "&#x1F4C8;", `
          ${intro("Your portfolio dashboard updates prices live throughout the trading day &mdash; no manual refresh needed.")}
          ${intro("<strong>What you get:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F30D;", "60+ Exchanges", "Prices from NYSE, NASDAQ, Euronext, London, Frankfurt, and more &mdash; powered by Yahoo Finance.")}
            ${feature("&#x26A1;", "Auto-refresh", "Quotes refresh every 15 seconds (configurable to 30s or 60s in your settings).")}
            ${feature("&#x1F4B1;", "Multi-currency", "See values in your local currency. We support 21 currencies with automatic conversion.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} Available on all plans</p>
          ${cta("Open Your Dashboard", "{{base_url}}/?utm_source=email&utm_medium=feature&utm_campaign=real_time_quotes")}`),
    bodyHtmlEs: featureEmailEs("Cotizaciones en Tiempo Real", "&#x1F4C8;", `
          ${intro("Tu dashboard actualiza los precios en vivo durante todo el d&iacute;a de negociaci&oacute;n &mdash; sin necesidad de refrescar.")}
          ${intro("<strong>Lo que obtienes:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F30D;", "60+ Bolsas", "Precios de NYSE, NASDAQ, Euronext, Londres, Frankfurt y m&aacute;s &mdash; con Yahoo Finance.")}
            ${feature("&#x26A1;", "Auto-refresco", "Las cotizaciones se actualizan cada 15 segundos (configurable a 30s o 60s).")}
            ${feature("&#x1F4B1;", "Multi-divisa", "Ve los valores en tu moneda local. Soportamos 21 divisas con conversi&oacute;n autom&aacute;tica.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} Disponible en todos los planes</p>
          ${cta("Abre Tu Dashboard", "{{base_url}}/?utm_source=email&utm_medium=feature&utm_campaign=real_time_quotes")}`),
    bodyText: "Real-time Quotes\n\nYour portfolio dashboard updates prices live throughout the trading day.\n\n- 60+ exchanges worldwide via Yahoo Finance\n- Auto-refresh every 15 seconds\n- 21 currencies with automatic conversion\n\nAvailable on all plans.\n\nOpen your dashboard: {{base_url}}/",
    bodyTextEs: "Cotizaciones en Tiempo Real\n\nTu dashboard actualiza precios en vivo durante todo el día.\n\n- 60+ bolsas con Yahoo Finance\n- Auto-refresco cada 15 segundos\n- 21 divisas con conversión automática\n\nDisponible en todos los planes.\n\nAbre tu dashboard: {{base_url}}/",
  },
  {
    slug: "feature-dividend-tracking",
    name: "Feature: Dividend Tracking",
    subject: "Never miss a dividend payment again",
    subjectEs: "No te pierdas nunca un pago de dividendos",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Dividend Tracking", "&#x1F4B0;", `
          ${intro("trefolio automatically detects dividends from your holdings and builds a complete income picture.")}
          ${intro("<strong>What you get:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4C5;", "Dividend Calendar", "See upcoming payments month by month. Know exactly when dividends land in your account.")}
            ${feature("&#x1F4B5;", "Annual Income", "Total projected dividend income across your entire portfolio with per-stock breakdowns.")}
            ${feature("&#x1F4C9;", "Yield-on-Cost", "Track your real yield based on purchase price &mdash; not just the current dividend rate.")}
            ${feature("&#x1F504;", "DRIP Simulation", "See how reinvesting dividends could compound your returns over 5, 10, or 20 years.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} Available on all plans</p>
          ${cta("View Your Dividends", "{{base_url}}/tools/dividends?utm_source=email&utm_medium=feature&utm_campaign=dividend_tracking")}`),
    bodyHtmlEs: featureEmailEs("Seguimiento de Dividendos", "&#x1F4B0;", `
          ${intro("trefolio detecta autom&aacute;ticamente los dividendos de tus posiciones y construye una imagen completa de tus ingresos.")}
          ${intro("<strong>Lo que obtienes:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4C5;", "Calendario de Dividendos", "Ve los pr&oacute;ximos pagos mes a mes. Sab&eacute; exactamente cu&aacute;ndo llegan los dividendos.")}
            ${feature("&#x1F4B5;", "Ingresos Anuales", "Ingresos proyectados por dividendos en toda tu cartera con desglose por acci&oacute;n.")}
            ${feature("&#x1F4C9;", "Rendimiento sobre Coste", "Sigue tu rendimiento real basado en el precio de compra.")}
            ${feature("&#x1F504;", "Simulaci&oacute;n DRIP", "Ve c&oacute;mo reinvertir dividendos podr&iacute;a multiplicar tus retornos en 5, 10 o 20 a&ntilde;os.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} Disponible en todos los planes</p>
          ${cta("Ver Tus Dividendos", "{{base_url}}/tools/dividends?utm_source=email&utm_medium=feature&utm_campaign=dividend_tracking")}`),
    bodyText: "Dividend Tracking\n\ntrefolio automatically detects dividends and builds a complete income picture.\n\n- Dividend calendar with monthly view\n- Annual income projections per stock\n- Yield-on-cost tracking\n- DRIP reinvestment simulation\n\nAvailable on all plans.\n\nView dividends: {{base_url}}/tools/dividends",
    bodyTextEs: "Seguimiento de Dividendos\n\ntrefolio detecta dividendos automáticamente.\n\n- Calendario mensual de dividendos\n- Proyección de ingresos anuales por acción\n- Rendimiento sobre coste\n- Simulación de reinversión DRIP\n\nDisponible en todos los planes.\n\nVer dividendos: {{base_url}}/tools/dividends",
  },
  {
    slug: "feature-ai-analysis",
    name: "Feature: AI Stock Analysis",
    subject: "Your AI-powered investment research assistant",
    subjectEs: "Tu asistente de investigaci\u00f3n de inversiones con IA",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("AI Stock Analysis", "&#x1F916;", `
          ${intro("Ask our AI about any stock in your portfolio or any ticker you&rsquo;re considering. Get institutional-quality analysis in seconds.")}
          ${intro("<strong>What you can ask:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4DD;", "Earnings Analysis", "\"How were AAPL's last earnings?\" &mdash; get a summary of results, guidance, and market reaction.")}
            ${feature("&#x2696;", "Risk Assessment", "\"What are the risks of holding TSLA?\" &mdash; competitive threats, valuation, and macro factors.")}
            ${feature("&#x1F50E;", "Competitor Comparison", "\"Compare MSFT vs GOOG\" &mdash; side-by-side analysis of financials, growth, and valuation.")}
            ${feature("&#x1F4CA;", "Portfolio Review", "\"Review my portfolio\" &mdash; AI analyzes your allocation, risk, and suggests improvements.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} 5 calls/month &nbsp;|&nbsp; ${BIFOLIO_BADGE} 20/month &nbsp;|&nbsp; ${TREFOLIO_BADGE} Unlimited</p>
          ${cta("Try AI Analysis Now", "{{base_url}}/?utm_source=email&utm_medium=feature&utm_campaign=ai_analysis")}`),
    bodyHtmlEs: featureEmailEs("An&aacute;lisis IA de Acciones", "&#x1F916;", `
          ${intro("Pregunta a nuestra IA sobre cualquier acci&oacute;n en tu cartera o cualquier ticker que est&eacute;s considerando.")}
          ${intro("<strong>Lo que puedes preguntar:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4DD;", "An&aacute;lisis de Resultados", "\"&iquest;C&oacute;mo fueron los resultados de AAPL?\" &mdash; resumen de resultados, gu&iacute;a y reacci&oacute;n del mercado.")}
            ${feature("&#x2696;", "Evaluaci&oacute;n de Riesgos", "\"&iquest;Cu&aacute;les son los riesgos de TSLA?\" &mdash; amenazas competitivas, valoraci&oacute;n y factores macro.")}
            ${feature("&#x1F50E;", "Comparaci&oacute;n", "\"Compara MSFT vs GOOG\" &mdash; an&aacute;lisis lado a lado de finanzas, crecimiento y valoraci&oacute;n.")}
            ${feature("&#x1F4CA;", "Revisi&oacute;n de Cartera", "\"Revisa mi cartera\" &mdash; la IA analiza tu distribuci&oacute;n, riesgo y sugiere mejoras.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} 5/mes &nbsp;|&nbsp; ${BIFOLIO_BADGE} 20/mes &nbsp;|&nbsp; ${TREFOLIO_BADGE} Ilimitado</p>
          ${cta("Probar An&aacute;lisis IA", "{{base_url}}/?utm_source=email&utm_medium=feature&utm_campaign=ai_analysis")}`),
    bodyText: "AI Stock Analysis\n\nAsk our AI about any stock. Get institutional-quality analysis in seconds.\n\n- Earnings analysis and guidance summaries\n- Risk assessment with competitive threats\n- Competitor comparison side-by-side\n- Full portfolio review with suggestions\n\nFolio: 5 calls/month | Bifolio: 20/month | Trefolio: Unlimited",
    bodyTextEs: "Análisis IA de Acciones\n\nPregunta a nuestra IA sobre cualquier acción.\n\n- Análisis de resultados\n- Evaluación de riesgos\n- Comparación de competidores\n- Revisión completa de cartera\n\nFolio: 5/mes | Bifolio: 20/mes | Trefolio: Ilimitado",
  },
  {
    slug: "feature-price-alerts",
    name: "Feature: Price Alerts",
    subject: "Set it and forget it \u2014 price alerts that work for you",
    subjectEs: "Conf\u00edguralas y olv\u00eddate \u2014 alertas de precio que trabajan por ti",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Price Alerts", "&#x1F514;", `
          ${intro("Never miss a price movement that matters. Set target prices and get notified the moment a stock crosses your threshold.")}
          ${intro("<strong>How it works:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F3AF;", "Threshold Alerts", "Set \"above\" or \"below\" price targets. Get notified when any stock crosses your line.")}
            ${feature("&#x1F4C9;", "Percent Change Alerts", "Track daily or from-purchase percent changes. Catch drops or rallies early.")}
            ${feature("&#x1F4E7;", "Multi-channel", "Email and push alerts on Bifolio. Add WhatsApp and device alerts on Trefolio.")}
            ${feature("&#x23F0;", "Cron-powered", "Our system checks prices every minute during market hours. You never need to watch the screen.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${BIFOLIO_BADGE} Up to 10 alerts &nbsp;|&nbsp; ${TREFOLIO_BADGE} Unlimited alerts</p>
          ${cta("Create Your First Alert", "{{base_url}}/tools/alerts?utm_source=email&utm_medium=feature&utm_campaign=price_alerts")}`),
    bodyHtmlEs: featureEmailEs("Alertas de Precio", "&#x1F514;", `
          ${intro("No te pierdas ning&uacute;n movimiento importante. Configura precios objetivo y recibe notificaciones al instante.")}
          ${intro("<strong>C&oacute;mo funciona:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F3AF;", "Alertas de Umbral", "Configura objetivos \"por encima\" o \"por debajo\". Recibe aviso cuando se crucen.")}
            ${feature("&#x1F4C9;", "Alertas de % de Cambio", "Sigue cambios porcentuales diarios o desde la compra.")}
            ${feature("&#x1F4E7;", "Multi-canal", "Email y push en Bifolio. A&ntilde;ade WhatsApp y dispositivo en Trefolio.")}
            ${feature("&#x23F0;", "Automatizado", "Nuestro sistema revisa precios cada minuto durante el horario de mercado.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${BIFOLIO_BADGE} Hasta 10 alertas &nbsp;|&nbsp; ${TREFOLIO_BADGE} Alertas ilimitadas</p>
          ${cta("Crea Tu Primera Alerta", "{{base_url}}/tools/alerts?utm_source=email&utm_medium=feature&utm_campaign=price_alerts")}`),
    bodyText: "Price Alerts\n\nSet target prices and get notified when stocks cross your threshold.\n\n- Above/below price targets\n- Daily or from-purchase % change alerts\n- Email, push, WhatsApp, and device notifications\n- Checked every minute during market hours\n\nBifolio: 10 alerts | Trefolio: Unlimited",
    bodyTextEs: "Alertas de Precio\n\nConfigura precios objetivo y recibe notificaciones.\n\n- Objetivos por encima/debajo\n- Alertas de % de cambio diario o desde compra\n- Email, push, WhatsApp y dispositivo\n- Revisado cada minuto en horario de mercado\n\nBifolio: 10 alertas | Trefolio: Ilimitadas",
  },
  {
    slug: "feature-broker-import",
    name: "Feature: Portfolio Import",
    subject: "Import your portfolio in under 60 seconds",
    subjectEs: "Importa tu cartera en menos de 60 segundos",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Portfolio Import", "&#x1F4E5;", `
          ${intro("Manually adding stocks one by one? There&rsquo;s a faster way. trefolio supports three import methods to get your full portfolio in seconds.")}
          ${intro("<strong>Choose your method:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x26A1;", "Broker Sync", "Connect your brokerage and we auto-sync your holdings, cash, and transactions. One-click setup, always up to date.", true)}
            ${feature("&#x1F4C4;", "CSV Upload", "Export a CSV from your broker and upload it. We support 20+ broker formats including DEGIRO, Interactive Brokers, Trade Republic, and more.", true)}
            ${feature("&#x1F916;", "AI Import", "Upload any file &mdash; CSV, PDF, or screenshot &mdash; and our AI will parse it into your portfolio. Works even with unusual formats.", true)}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} CSV &amp; Manual &nbsp;|&nbsp; ${BIFOLIO_BADGE} + Broker Sync &nbsp;|&nbsp; ${TREFOLIO_BADGE} + AI Import</p>
          ${cta("Import Your Portfolio", "{{base_url}}/import?utm_source=email&utm_medium=feature&utm_campaign=broker_import")}`),
    bodyHtmlEs: featureEmailEs("Importar Cartera", "&#x1F4E5;", `
          ${intro("&iquest;A&ntilde;adiendo acciones una por una? Hay una forma m&aacute;s r&aacute;pida. trefolio soporta tres m&eacute;todos de importaci&oacute;n.")}
          ${intro("<strong>Elige tu m&eacute;todo:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x26A1;", "Sincronizaci&oacute;n de Broker", "Conecta tu br&oacute;ker y sincronizamos posiciones, efectivo y transacciones autom&aacute;ticamente.", true)}
            ${feature("&#x1F4C4;", "Subir CSV", "Exporta un CSV de tu br&oacute;ker y s&uacute;belo. Soportamos 20+ formatos incluyendo DEGIRO, Interactive Brokers, Trade Republic y m&aacute;s.", true)}
            ${feature("&#x1F916;", "Importar con IA", "Sube cualquier archivo &mdash; CSV, PDF o captura &mdash; y nuestra IA lo convertir&aacute; en tu cartera.", true)}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} CSV y Manual &nbsp;|&nbsp; ${BIFOLIO_BADGE} + Broker Sync &nbsp;|&nbsp; ${TREFOLIO_BADGE} + IA Import</p>
          ${cta("Importar Tu Cartera", "{{base_url}}/import?utm_source=email&utm_medium=feature&utm_campaign=broker_import")}`),
    bodyText: "Portfolio Import\n\nGet your full portfolio in seconds with three import methods.\n\n- Broker Sync: auto-sync holdings, cash, and transactions (Bifolio+)\n- CSV Upload: 20+ broker formats supported (all plans)\n- AI Import: upload any file format (Trefolio)\n\nImport now: {{base_url}}/import",
    bodyTextEs: "Importar Cartera\n\nTres métodos para importar tu cartera en segundos.\n\n- Broker Sync: sincroniza automáticamente (Bifolio+)\n- CSV: 20+ formatos de broker (todos los planes)\n- IA Import: cualquier formato de archivo (Trefolio)\n\nImportar: {{base_url}}/import",
  },
  {
    slug: "feature-fundamentals",
    name: "Feature: Company Fundamentals",
    subject: "Deep-dive into any company\u2019s financials",
    subjectEs: "Profundiza en las finanzas de cualquier empresa",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Company Fundamentals", "&#x1F3E6;", `
          ${intro("Go beyond stock prices. trefolio gives you access to complete company financials &mdash; the same data professional analysts use.")}
          ${intro("<strong>What you get:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4CA;", "Income Statement", "Revenue, net income, margins, and earnings per share &mdash; quarterly and annual.")}
            ${feature("&#x1F4CB;", "Balance Sheet", "Assets, liabilities, debt levels, and book value at a glance.")}
            ${feature("&#x1F4B8;", "Cash Flow", "Operating, investing, and financing cash flows. See if the company generates real cash.")}
            ${feature("&#x1F50D;", "Insider Trades", "See what executives and directors are buying and selling.")}
            ${feature("&#x1F3DB;", "Institutional Holdings", "Track what the big funds own &mdash; Vanguard, BlackRock, Fidelity, and more.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${TREFOLIO_BADGE} Trefolio Pro exclusive</p>
          ${cta("Explore Fundamentals", "{{base_url}}/?utm_source=email&utm_medium=feature&utm_campaign=fundamentals")}`),
    bodyHtmlEs: featureEmailEs("Fundamentales de Empresa", "&#x1F3E6;", `
          ${intro("Ve m&aacute;s all&aacute; de los precios. trefolio te da acceso a las finanzas completas de cada empresa.")}
          ${intro("<strong>Lo que obtienes:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4CA;", "Cuenta de Resultados", "Ingresos, beneficio neto, m&aacute;rgenes y BPA &mdash; trimestral y anual.")}
            ${feature("&#x1F4CB;", "Balance", "Activos, pasivos, niveles de deuda y valor contable.")}
            ${feature("&#x1F4B8;", "Flujo de Caja", "Flujos operativos, de inversi&oacute;n y financiaci&oacute;n.")}
            ${feature("&#x1F50D;", "Operaciones de Insiders", "Ve qu&eacute; compran y venden los ejecutivos y directores.")}
            ${feature("&#x1F3DB;", "Posiciones Institucionales", "Sigue lo que poseen los grandes fondos &mdash; Vanguard, BlackRock, Fidelity y m&aacute;s.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${TREFOLIO_BADGE} Exclusivo de Trefolio Pro</p>
          ${cta("Explorar Fundamentales", "{{base_url}}/?utm_source=email&utm_medium=feature&utm_campaign=fundamentals")}`),
    bodyText: "Company Fundamentals\n\nComplete financials for any company.\n\n- Income statement: revenue, margins, EPS\n- Balance sheet: assets, liabilities, debt\n- Cash flow statement\n- Insider trades\n- Institutional holdings\n\nTrefolio Pro exclusive.",
    bodyTextEs: "Fundamentales de Empresa\n\nFinanzas completas de cualquier empresa.\n\n- Cuenta de resultados\n- Balance\n- Flujo de caja\n- Operaciones de insiders\n- Posiciones institucionales\n\nExclusivo de Trefolio Pro.",
  },
  {
    slug: "feature-stock-screener",
    name: "Feature: Stock Screener",
    subject: "Find your next investment with the stock screener",
    subjectEs: "Encuentra tu pr\u00f3xima inversi\u00f3n con el buscador de acciones",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Stock Screener", "&#x1F50D;", `
          ${intro("Discover stocks that match your investment criteria. Filter 600+ stocks across multiple dimensions and apply proven strategies.")}
          ${intro("<strong>Filter by:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4CF;", "6 Filter Dimensions", "Market cap, P/E ratio, dividend yield, sector, country, and exchange. Combine as many as you want.")}
            ${feature("&#x1F3AF;", "5 Built-in Strategies", "Value investing, dividend growth, momentum, quality, and small-cap strategies &mdash; one-click presets.")}
            ${feature("&#x1F4CA;", "Rich Data", "Price, change %, market cap, P/E, dividend yield, and sector for every result.")}
            ${feature("&#x2795;", "Quick Add", "Found something interesting? Add it to your portfolio or watchlist directly from results.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${TREFOLIO_BADGE} Trefolio Pro exclusive</p>
          ${cta("Open the Screener", "{{base_url}}/tools/screener?utm_source=email&utm_medium=feature&utm_campaign=stock_screener")}`),
    bodyHtmlEs: featureEmailEs("Buscador de Acciones", "&#x1F50D;", `
          ${intro("Descubre acciones que coincidan con tus criterios de inversi&oacute;n. Filtra 600+ acciones y aplica estrategias probadas.")}
          ${intro("<strong>Filtra por:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4CF;", "6 Dimensiones de Filtro", "Capitalizaci&oacute;n, P/E, dividendo, sector, pa&iacute;s y bolsa. Combina todos los que quieras.")}
            ${feature("&#x1F3AF;", "5 Estrategias", "Valor, crecimiento de dividendos, momentum, calidad y small-cap &mdash; presets con un clic.")}
            ${feature("&#x1F4CA;", "Datos Completos", "Precio, cambio %, cap, P/E, dividendo y sector para cada resultado.")}
            ${feature("&#x2795;", "A&ntilde;adir R&aacute;pido", "&iquest;Encontraste algo? A&ntilde;&aacute;delo a tu cartera o watchlist directamente.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${TREFOLIO_BADGE} Exclusivo de Trefolio Pro</p>
          ${cta("Abrir el Buscador", "{{base_url}}/tools/screener?utm_source=email&utm_medium=feature&utm_campaign=stock_screener")}`),
    bodyText: "Stock Screener\n\nFilter 600+ stocks with 6 dimensions and 5 strategies.\n\n- Market cap, P/E, dividend yield, sector, country, exchange\n- Value, dividend growth, momentum, quality, small-cap strategies\n- Add to portfolio or watchlist from results\n\nTrefolio Pro exclusive.",
    bodyTextEs: "Buscador de Acciones\n\nFiltra 600+ acciones con 6 dimensiones y 5 estrategias.\n\n- Cap, P/E, dividendo, sector, país, bolsa\n- Estrategias: valor, dividendo, momentum, calidad, small-cap\n- Añade a cartera o watchlist desde resultados\n\nExclusivo de Trefolio Pro.",
  },
  {
    slug: "feature-tax-reports",
    name: "Feature: Tax Reports",
    subject: "Tax season made easy \u2014 EU tax reports with AI",
    subjectEs: "La temporada fiscal f\u00e1cil \u2014 informes fiscales EU con IA",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Tax Reports", "&#x1F4CB;", `
          ${intro("Tax reporting doesn&rsquo;t have to be painful. trefolio generates country-specific tax reports and includes an AI Tax Assistant for your questions.")}
          ${intro("<strong>What you get:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F1EA;&#x1F1FA;", "5 EU Countries", "Country-specific reports for Germany, France, Spain, Netherlands, and Italy.")}
            ${feature("&#x1F4C4;", "Gains &amp; Losses", "Calculated capital gains, losses, and holding period for each position.")}
            ${feature("&#x1F4B0;", "Dividend Income", "Gross dividends, withholding tax, and net income by country of origin.")}
            ${feature("&#x1F916;", "AI Tax Assistant", "Ask questions like \"How much withholding tax did I pay on US dividends?\" and get instant answers.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${TREFOLIO_BADGE} Trefolio Pro exclusive</p>
          ${cta("Generate Your Tax Report", "{{base_url}}/tools/tax?utm_source=email&utm_medium=feature&utm_campaign=tax_reports")}`),
    bodyHtmlEs: featureEmailEs("Informes Fiscales", "&#x1F4CB;", `
          ${intro("La declaraci&oacute;n fiscal no tiene que ser complicada. trefolio genera informes espec&iacute;ficos por pa&iacute;s con un Asistente Fiscal IA.")}
          ${intro("<strong>Lo que obtienes:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F1EA;&#x1F1FA;", "5 Pa&iacute;ses EU", "Informes espec&iacute;ficos para Alemania, Francia, Espa&ntilde;a, Pa&iacute;ses Bajos e Italia.")}
            ${feature("&#x1F4C4;", "Ganancias y P&eacute;rdidas", "Plusval&iacute;as, minusval&iacute;as y periodo de tenencia de cada posici&oacute;n.")}
            ${feature("&#x1F4B0;", "Ingresos por Dividendos", "Dividendos brutos, retenci&oacute;n fiscal y neto por pa&iacute;s de origen.")}
            ${feature("&#x1F916;", "Asistente Fiscal IA", "Pregunta cosas como \"&iquest;Cu&aacute;nta retenci&oacute;n pagu&eacute; en dividendos de EEUU?\" y obt&eacute;n respuestas.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${TREFOLIO_BADGE} Exclusivo de Trefolio Pro</p>
          ${cta("Generar Informe Fiscal", "{{base_url}}/tools/tax?utm_source=email&utm_medium=feature&utm_campaign=tax_reports")}`),
    bodyText: "Tax Reports\n\nCountry-specific EU tax reports with AI assistant.\n\n- Reports for DE, FR, ES, NL, IT\n- Capital gains/losses calculation\n- Dividend income with withholding tax\n- AI Tax Assistant for questions\n\nTrefolio Pro exclusive.",
    bodyTextEs: "Informes Fiscales\n\nInformes fiscales EU específicos por país con asistente IA.\n\n- Informes para DE, FR, ES, NL, IT\n- Cálculo de plusvalías/minusvalías\n- Ingresos por dividendos con retención\n- Asistente Fiscal IA\n\nExclusivo de Trefolio Pro.",
  },
  {
    slug: "feature-portfolio-simulator",
    name: "Feature: Portfolio Simulator",
    subject: "What if? Backtest and stress-test your portfolio",
    subjectEs: "\u00bfY si...? Simula y pon a prueba tu cartera",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Portfolio Simulator", "&#x1F3AE;", `
          ${intro("Test your investment ideas before committing real money. The portfolio simulator lets you backtest, stress-test, and explore what-if scenarios.")}
          ${intro("<strong>Three modes:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x23EA;", "Backtest", "See how a portfolio would have performed historically. Compare against S&amp;P 500, MSCI World, or a custom benchmark.")}
            ${feature("&#x1F300;", "Stress Testing", "What if the market drops 30%? What about rising rates? See how your portfolio holds up under different scenarios.")}
            ${feature("&#x1F52E;", "What-if Analysis", "Add or remove positions, change allocations, and instantly see the impact on risk and return.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${TREFOLIO_BADGE} Trefolio Pro exclusive</p>
          ${cta("Open the Simulator", "{{base_url}}/tools/simulator?utm_source=email&utm_medium=feature&utm_campaign=portfolio_simulator")}`),
    bodyHtmlEs: featureEmailEs("Simulador de Cartera", "&#x1F3AE;", `
          ${intro("Prueba tus ideas de inversi&oacute;n antes de arriesgar dinero real. El simulador te permite hacer backtesting, pruebas de estr&eacute;s y escenarios what-if.")}
          ${intro("<strong>Tres modos:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x23EA;", "Backtesting", "Mira c&oacute;mo habr&iacute;a funcionado una cartera hist&oacute;ricamente. Compara contra S&amp;P 500, MSCI World o un benchmark personalizado.")}
            ${feature("&#x1F300;", "Pruebas de Estr&eacute;s", "&iquest;Qu&eacute; pasa si el mercado cae un 30%? Ve c&oacute;mo tu cartera aguanta diferentes escenarios.")}
            ${feature("&#x1F52E;", "An&aacute;lisis What-if", "A&ntilde;ade o elimina posiciones, cambia distribuciones y ve el impacto instant&aacute;neo en riesgo y retorno.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${TREFOLIO_BADGE} Exclusivo de Trefolio Pro</p>
          ${cta("Abrir el Simulador", "{{base_url}}/tools/simulator?utm_source=email&utm_medium=feature&utm_campaign=portfolio_simulator")}`),
    bodyText: "Portfolio Simulator\n\nBacktest, stress-test, and explore what-if scenarios.\n\n- Historical backtesting vs benchmarks\n- Stress testing: market crashes, rate changes\n- What-if: add/remove positions, see instant impact\n\nTrefolio Pro exclusive.",
    bodyTextEs: "Simulador de Cartera\n\nBacktesting, pruebas de estrés y escenarios what-if.\n\n- Backtesting histórico vs benchmarks\n- Pruebas de estrés: caídas de mercado, cambios de tipos\n- What-if: añade/elimina posiciones\n\nExclusivo de Trefolio Pro.",
  },
  {
    slug: "feature-net-worth",
    name: "Feature: Net Worth Tracking",
    subject: "See your complete financial picture",
    subjectEs: "Ve tu imagen financiera completa",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Net Worth Tracking", "&#x1F3E0;", `
          ${intro("Your investments are just one part of your finances. Track everything &mdash; real estate, savings, pensions, and more &mdash; in one place.")}
          ${intro("<strong>What you can track:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F3E0;", "Real Estate", "Add properties with current value. Update when market conditions change.")}
            ${feature("&#x1F4B0;", "Savings Accounts", "Track cash in banks across different currencies.")}
            ${feature("&#x1F3E6;", "Pensions &amp; Insurance", "Include pension funds and life insurance policies in your net worth.")}
            ${feature("&#x1F4CA;", "Total Net Worth", "See everything combined: stocks + ETFs + crypto + real estate + savings + pensions = your complete picture.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${BIFOLIO_BADGE} Up to 10 assets &nbsp;|&nbsp; ${TREFOLIO_BADGE} Up to 999 assets</p>
          ${cta("Add Manual Assets", "{{base_url}}/tools/net-worth?utm_source=email&utm_medium=feature&utm_campaign=net_worth")}`),
    bodyHtmlEs: featureEmailEs("Seguimiento de Patrimonio Neto", "&#x1F3E0;", `
          ${intro("Tus inversiones son solo una parte de tus finanzas. Registra todo &mdash; inmuebles, ahorros, pensiones y m&aacute;s &mdash; en un solo lugar.")}
          ${intro("<strong>Lo que puedes registrar:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F3E0;", "Inmuebles", "A&ntilde;ade propiedades con valor actual. Actualiza cuando cambien las condiciones del mercado.")}
            ${feature("&#x1F4B0;", "Cuentas de Ahorro", "Registra efectivo en bancos en diferentes divisas.")}
            ${feature("&#x1F3E6;", "Pensiones y Seguros", "Incluye fondos de pensiones y p&oacute;lizas de seguro de vida.")}
            ${feature("&#x1F4CA;", "Patrimonio Total", "Ve todo combinado: acciones + ETFs + crypto + inmuebles + ahorros + pensiones.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${BIFOLIO_BADGE} Hasta 10 activos &nbsp;|&nbsp; ${TREFOLIO_BADGE} Hasta 999 activos</p>
          ${cta("A&ntilde;adir Activos Manuales", "{{base_url}}/tools/net-worth?utm_source=email&utm_medium=feature&utm_campaign=net_worth")}`),
    bodyText: "Net Worth Tracking\n\nTrack your complete financial picture beyond stocks.\n\n- Real estate, savings accounts, pensions\n- All combined into total net worth\n\nBifolio: 10 manual assets | Trefolio: 999 assets",
    bodyTextEs: "Patrimonio Neto\n\nSigue tu imagen financiera completa.\n\n- Inmuebles, cuentas de ahorro, pensiones\n- Todo combinado en patrimonio total\n\nBifolio: 10 activos | Trefolio: 999 activos",
  },
  {
    slug: "feature-crypto",
    name: "Feature: Crypto Portfolio",
    subject: "Crypto meets your investment dashboard",
    subjectEs: "Crypto se une a tu dashboard de inversiones",
    category: "feature",
    experienceLevel: "",
    bodyHtml: featureEmail("Crypto Portfolio", "&#x1FA99;", `
          ${intro("Track crypto alongside your stocks and ETFs. Get the same level of analysis and insights for your crypto holdings.")}
          ${intro("<strong>What you get:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4CA;", "Crypto Dashboard", "Prices, 24h changes, volume, and market cap for top cryptocurrencies.")}
            ${feature("&#x1FA99;", "Portfolio Tracking", "Add crypto positions alongside stocks. See unified portfolio value and allocation.")}
            ${feature("&#x1F4C8;", "Charts &amp; History", "Price charts with multiple timeframes and exchange rate overlays.")}
            ${feature("&#x1F916;", "AI Crypto Analysis", "Ask our AI about any crypto &mdash; fundamentals, trends, and market analysis.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} Market overview &nbsp;|&nbsp; ${TREFOLIO_BADGE} Full portfolio tracking &amp; AI</p>
          ${cta("Explore Crypto", "{{base_url}}/crypto?utm_source=email&utm_medium=feature&utm_campaign=crypto")}`),
    bodyHtmlEs: featureEmailEs("Cartera Crypto", "&#x1FA99;", `
          ${intro("Sigue crypto junto a tus acciones y ETFs. Obt&eacute;n el mismo nivel de an&aacute;lisis para tus criptomonedas.")}
          ${intro("<strong>Lo que obtienes:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4CA;", "Dashboard Crypto", "Precios, cambio 24h, volumen y capitalizaci&oacute;n de las principales criptomonedas.")}
            ${feature("&#x1FA99;", "Seguimiento de Cartera", "A&ntilde;ade posiciones crypto junto a acciones. Valor y distribuci&oacute;n unificados.")}
            ${feature("&#x1F4C8;", "Gr&aacute;ficos e Historial", "Gr&aacute;ficos de precio con m&uacute;ltiples periodos y tipos de cambio.")}
            ${feature("&#x1F916;", "An&aacute;lisis IA Crypto", "Pregunta a nuestra IA sobre cualquier crypto &mdash; fundamentales, tendencias y mercado.")}
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">${FREE_BADGE} Vista de mercado &nbsp;|&nbsp; ${TREFOLIO_BADGE} Cartera completa y IA</p>
          ${cta("Explorar Crypto", "{{base_url}}/crypto?utm_source=email&utm_medium=feature&utm_campaign=crypto")}`),
    bodyText: "Crypto Portfolio\n\nTrack crypto alongside stocks and ETFs.\n\n- Crypto market overview (all plans)\n- Full portfolio tracking (Trefolio)\n- Charts and price history\n- AI crypto analysis\n\nFolio: Market overview | Trefolio: Full tracking & AI",
    bodyTextEs: "Cartera Crypto\n\nSigue crypto junto a acciones y ETFs.\n\n- Vista de mercado crypto (todos los planes)\n- Seguimiento completo (Trefolio)\n- Gráficos e historial\n- Análisis IA crypto\n\nFolio: Vista de mercado | Trefolio: Tracking completo y IA",
  },
];

/* ── 6. Referral Program ── */

const referralProgramHtml = `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          <p style="margin:0 0 8px;font-size:48px;text-align:center;">&#x1F91D;</p>
          ${heading("Share trefolio, earn free Pro time")}
          ${intro("Love using trefolio? Now you can share it with friends and earn <strong>30 days of Pro</strong> for every friend who signs up and verifies their account.")}
          ${intro("<strong>How it works:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F517;", "Share your personal link", "Send your unique referral link to friends, family, or your investing community. They get a great portfolio tool, you get rewarded.", true)}
            ${feature("&#x1F4E7;", "They sign up and verify", "Your friend creates a trefolio account using your link and verifies their email. That&rsquo;s it &mdash; no purchase required.", true)}
            ${feature("&#x1F381;", "You earn 30 days of Pro", "Once they verify, you automatically get 30 days of Trefolio Pro added to your account. Stack up to 365 days!", true)}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="padding:20px 24px;background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:12px;border:2px solid #10b981;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#065f46;text-transform:uppercase;letter-spacing:1px;">Your referral link</p>
              <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;word-break:break-all;font-family:monospace;">{{referral_link}}</p>
              <p style="margin:0;font-size:12px;color:#065f46;">Share this link with friends to start earning</p>
            </td></tr>
          </table>
          ${cta("Share Your Link", "{{base_url}}/profile?section=referrals&utm_source=email&utm_medium=referral&utm_campaign=referral_program")}
        </td></tr>
        ${divider()}
        ${tip("&#x1F4A1; <strong>Pro tip:</strong> Share on WhatsApp, Telegram, or X for maximum reach. The more friends join, the more free Pro time you earn!")}
${FOOTER}`;

const referralProgramHtmlEs = `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          <p style="margin:0 0 8px;font-size:48px;text-align:center;">&#x1F91D;</p>
          ${heading("Comparte trefolio, gana tiempo Pro gratis")}
          ${intro("&iquest;Te encanta trefolio? Ahora puedes compartirlo con amigos y ganar <strong>30 d&iacute;as de Pro</strong> por cada amigo que se registre y verifique su cuenta.")}
          ${intro("<strong>C&oacute;mo funciona:</strong>")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F517;", "Comparte tu enlace personal", "Env&iacute;a tu enlace &uacute;nico de referido a amigos, familia o tu comunidad de inversores. Ellos obtienen una gran herramienta, t&uacute; ganas.", true)}
            ${feature("&#x1F4E7;", "Se registran y verifican", "Tu amigo crea una cuenta en trefolio usando tu enlace y verifica su email. Eso es todo &mdash; no necesitan comprar nada.", true)}
            ${feature("&#x1F381;", "Ganas 30 d&iacute;as de Pro", "Cuando verifican, autom&aacute;ticamente recibes 30 d&iacute;as de Trefolio Pro en tu cuenta. &iexcl;Acumula hasta 365 d&iacute;as!", true)}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="padding:20px 24px;background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:12px;border:2px solid #10b981;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#065f46;text-transform:uppercase;letter-spacing:1px;">Tu enlace de referido</p>
              <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;word-break:break-all;font-family:monospace;">{{referral_link}}</p>
              <p style="margin:0;font-size:12px;color:#065f46;">Comparte este enlace con amigos para empezar a ganar</p>
            </td></tr>
          </table>
          ${cta("Compartir Tu Enlace", "{{base_url}}/profile?section=referrals&utm_source=email&utm_medium=referral&utm_campaign=referral_program")}
        </td></tr>
        ${divider()}
        ${tip("&#x1F4A1; <strong>Consejo:</strong> Comparte en WhatsApp, Telegram o X para m&aacute;ximo alcance. &iexcl;Cuantos m&aacute;s amigos se unan, m&aacute;s tiempo Pro gratis ganas!")}
${FOOTER_ES}`;

/* ── All templates ── */

export const EMAIL_TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    slug: "welcome-no-stocks",
    name: "Welcome — No Stocks Added",
    subject: "Welcome to trefolio \u2014 here\u2019s what you can do",
    subjectEs: "Bienvenido a trefolio \u2014 esto es lo que puedes hacer",
    bodyHtml: welcomeNoStocksHtml,
    bodyHtmlEs: welcomeNoStocksHtmlEs,
    bodyText: "Welcome to trefolio! 🍀\n\nYour account is ready. trefolio is the extra leaf for your portfolio — here's what you can do:\n\n- Real-time quotes from 60+ exchanges (Free)\n- Dividend tracking with annual projections (Free)\n- AI stock analysis — 5 free calls/month (Free)\n- Easy import from 20+ brokers (Free)\n- Price alerts via email & push (Bifolio)\n- Advanced metrics: Sharpe, drawdown, volatility (Bifolio)\n- Company fundamentals & intelligence (Trefolio)\n- Stock screener: 600+ stocks (Trefolio)\n\nAdd your first stock: {{base_url}}/import",
    bodyTextEs: "¡Bienvenido a trefolio! 🍀\n\nTu cuenta está lista. trefolio es la hoja extra para tu cartera — esto es lo que puedes hacer:\n\n- Cotizaciones en tiempo real de 60+ bolsas (Gratis)\n- Seguimiento de dividendos (Gratis)\n- Análisis IA — 5 consultas gratis/mes (Gratis)\n- Importación fácil de 20+ brókers (Gratis)\n- Alertas de precio por email y push (Bifolio)\n- Métricas avanzadas (Bifolio)\n- Fundamentales e inteligencia (Trefolio)\n- Buscador de acciones (Trefolio)\n\nAñade tu primera acción: {{base_url}}/import",
    category: "lifecycle",
    experienceLevel: "",
  },
  {
    slug: "welcome-free-with-stocks",
    name: "Welcome — Free with Stocks + Voucher",
    subject: "You\u2019re off to a great start \u2014 here\u2019s 75% off",
    subjectEs: "Has empezado genial \u2014 aqu\u00ed tienes un 75% de descuento",
    bodyHtml: welcomeFreeStocksHtml,
    bodyHtmlEs: welcomeFreeStocksHtmlEs,
    bodyText: "You're off to a great start!\n\nYou've added your first stocks. Here's what trefolio can do for you:\n\n- Real-time dashboard (Free)\n- Dividend insights (Free)\n- AI stock analysis (Free: 5/mo, Bifolio: 20/mo, Trefolio: unlimited)\n- Price alerts (Bifolio)\n- Performance metrics (Bifolio)\n- Company fundamentals (Trefolio)\n- Stock screener & simulator (Trefolio)\n\n🎁 EXCLUSIVE OFFER: 75% OFF\nUse code: EARLYBIRD\nValid on Bifolio & Trefolio — monthly or annual\n\nUpgrade: {{base_url}}/profile",
    bodyTextEs: "¡Has empezado genial!\n\nHas añadido tus primeras acciones. Esto es lo que trefolio puede hacer:\n\n- Dashboard en tiempo real (Gratis)\n- Insights de dividendos (Gratis)\n- Análisis IA (Gratis: 5/mes, Bifolio: 20/mes, Trefolio: ilimitado)\n- Alertas de precio (Bifolio)\n- Métricas de rendimiento (Bifolio)\n- Fundamentales (Trefolio)\n- Buscador y simulador (Trefolio)\n\n🎁 OFERTA EXCLUSIVA: 75% DTO\nCódigo: EARLYBIRD\nVálido en Bifolio y Trefolio — mensual o anual\n\nMejorar: {{base_url}}/profile",
    category: "lifecycle",
    experienceLevel: "",
  },
  {
    slug: "upgrade-bifolio",
    name: "Upgrade — Bifolio",
    subject: "Welcome to Bifolio \u2014 here\u2019s what you unlocked",
    subjectEs: "Bienvenido a Bifolio \u2014 esto es lo que has desbloqueado",
    bodyHtml: bifolioUpgradeHtml,
    bodyHtmlEs: bifolioUpgradeHtmlEs,
    bodyText: "Welcome to Bifolio!\n\nHere's everything you just unlocked:\n\n✅ Portfolio sharing — public link\n✅ CSV export\n✅ Email & push alerts — up to 10\n✅ Advanced metrics (Sharpe, drawdown, volatility)\n✅ Full portfolio growth history\n✅ Net worth tracking — up to 10 manual assets\n✅ Broker sync — one-click auto-sync\n✅ 20 AI calls/month (up from 5)\n✅ AI Support Agent — 24/7\n\nSet up your first alert: {{base_url}}/tools/alerts\n\nWant more? Trefolio unlocks fundamentals, screener, tax reports, WhatsApp alerts, and unlimited holdings.",
    bodyTextEs: "¡Bienvenido a Bifolio!\n\nEsto es lo que has desbloqueado:\n\n✅ Compartir cartera — enlace público\n✅ Exportar CSV\n✅ Alertas email y push — hasta 10\n✅ Métricas avanzadas\n✅ Historial completo de rendimiento\n✅ Patrimonio neto — hasta 10 activos\n✅ Sincronización de broker\n✅ 20 consultas IA/mes\n✅ Agente de Soporte IA — 24/7\n\nConfigura tu primera alerta: {{base_url}}/tools/alerts\n\n¿Quieres más? Trefolio desbloquea fundamentales, buscador, informes fiscales y posiciones ilimitadas.",
    category: "lifecycle",
    experienceLevel: "",
  },
  {
    slug: "upgrade-trefolio",
    name: "Upgrade — Trefolio Pro",
    subject: "Welcome to Trefolio Pro \u2014 your full toolkit",
    subjectEs: "Bienvenido a Trefolio Pro \u2014 tu kit completo",
    bodyHtml: trefolioUpgradeHtml,
    bodyHtmlEs: trefolioUpgradeHtmlEs,
    bodyText: "Welcome to Trefolio Pro!\n\nYou now have full access to everything:\n\nDATA & ANALYSIS\n✅ Alpha Vantage premium data\n✅ Company fundamentals\n✅ Economic indicators\n\nINTELLIGENCE\n✅ News with sentiment analysis\n✅ Insider trades & institutional holdings\n✅ Unlimited AI analysis\n\nADVANCED TOOLS\n✅ Sharpe, drawdown, volatility\n✅ Stock screener: 600+ stocks\n✅ Full performance history\n\nCRYPTO PRO\n✅ Charts, exchange rates, AI analysis\n\nTAX & PLANNING\n✅ EU tax reports with AI assistant\n✅ Portfolio simulator\n✅ Financial planning (FIRE, retirement)\n\nALERTS & LIMITS\n✅ WhatsApp & device notifications\n✅ Unlimited alerts & holdings\n✅ Up to 5 portfolios\n\nYou're one of our first 500 Pro members. Thank you!",
    bodyTextEs: "¡Bienvenido a Trefolio Pro!\n\nAcceso completo a todo:\n\nDATOS\n✅ Alpha Vantage premium\n✅ Fundamentales de empresa\n✅ Indicadores económicos\n\nINTELIGENCIA\n✅ Noticias con sentimiento\n✅ Insiders e institucionales\n✅ IA ilimitada\n\nHERRAMIENTAS\n✅ Sharpe, drawdown, volatilidad\n✅ Buscador: 600+ acciones\n✅ Historial completo\n\nCRYPTO PRO\n✅ Gráficos, tipos de cambio, IA\n\nFISCAL\n✅ Informes fiscales EU con IA\n✅ Simulador de cartera\n✅ Planificación financiera\n\nALERTAS\n✅ WhatsApp y dispositivo\n✅ Ilimitadas\n✅ 5 carteras\n\n¡Eres de los primeros 500 Pro! Gracias.",
    category: "lifecycle",
    experienceLevel: "",
  },
  {
    slug: "trial-invitation",
    name: "Trial — 7-Day Pro Invitation",
    subject: "Your 7-day Trefolio Pro trial is ready",
    subjectEs: "Tu prueba de 7 d\u00edas de Trefolio Pro est\u00e1 lista",
    bodyHtml: `${headerWithBadge("7-DAY PRO TRIAL")}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Your Pro trial is waiting</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">Hi {{display_name}}, you&rsquo;ve been building your portfolio on trefolio &mdash; now experience the full toolkit for 7 days, completely free.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${proFeatureGroup("Data &amp; Analysis", ["Alpha Vantage premium data", "Fundamentals: income, balance sheet, cash flow", "Economic indicators dashboard"])}
            ${proFeatureGroup("Intelligence", ["News feed with sentiment analysis", "Insider trades &amp; institutional holdings", "AI analysis: 30 calls/day, unlimited monthly"])}
            ${proFeatureGroup("Advanced Tools", ["Sharpe ratio, max drawdown, volatility", "Full portfolio performance history", "Stock screener: 600+ stocks, 6 filters"])}
            ${proFeatureGroup("Alerts &amp; Limits", ["WhatsApp &amp; device notifications", "Unlimited price alerts &amp; holdings", "Up to 5 portfolios"])}
          </table>
          <div style="height:12px;"></div>
          ${cta("Activate your free trial", "{{base_url}}/trial/activate?token={{trial_token}}")}
          ${ctaSecondary("See what's included", "{{base_url}}/pricing")}
          <p style="margin:20px 0 0;font-size:13px;color:#64748b;text-align:center;line-height:1.5;">No credit card required. After 7 days, your account returns to the Free plan &mdash; no surprises.</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">I built trefolio because I wanted a better way to track my own portfolio. I hope you&rsquo;ll enjoy having the full experience.</p>
            <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">Let me know what you think &mdash; just reply to this email.</p>
            <p style="margin:12px 0 0;font-size:14px;color:#0f172a;font-weight:600;">Marcos</p>
            <p style="margin:0;font-size:12px;color:#64748b;">Founder, trefolio</p>
          </div>
        </td></tr>
${FOOTER}`,
    bodyHtmlEs: `${headerWithBadge("PRUEBA PRO 7 D\u00cdAS")}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Tu prueba Pro te espera</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">Hola {{display_name}}, has estado construyendo tu cartera en trefolio &mdash; ahora experimenta todas las herramientas durante 7 d&iacute;as, completamente gratis.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            ${proFeatureGroup("Datos y An&aacute;lisis", ["Datos premium de Alpha Vantage", "Fundamentales: ingresos, balance, flujo de caja", "Panel de indicadores econ&oacute;micos"])}
            ${proFeatureGroup("Inteligencia", ["Feed de noticias con an&aacute;lisis de sentimiento", "Operaciones de insiders y posiciones institucionales", "An&aacute;lisis IA: 30 consultas/d&iacute;a, mensuales ilimitadas"])}
            ${proFeatureGroup("Herramientas Avanzadas", ["Ratio Sharpe, drawdown m&aacute;ximo, volatilidad", "Historial completo de rendimiento", "Screener de acciones: 600+, 6 filtros"])}
            ${proFeatureGroup("Alertas y L&iacute;mites", ["Notificaciones WhatsApp y dispositivos", "Alertas de precio y posiciones ilimitadas", "Hasta 5 carteras"])}
          </table>
          <div style="height:12px;"></div>
          ${cta("Activa tu prueba gratuita", "{{base_url}}/trial/activate?token={{trial_token}}")}
          ${ctaSecondary("Ver qu&eacute; incluye", "{{base_url}}/pricing")}
          <p style="margin:20px 0 0;font-size:13px;color:#64748b;text-align:center;line-height:1.5;">Sin tarjeta de cr&eacute;dito. Despu&eacute;s de 7 d&iacute;as, tu cuenta vuelve al plan gratuito &mdash; sin sorpresas.</p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">Cre&eacute; trefolio porque quer&iacute;a una mejor forma de seguir mi propia cartera. Espero que disfrutes la experiencia completa.</p>
            <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">Cu&eacute;ntame qu&eacute; te parece &mdash; responde a este email.</p>
            <p style="margin:12px 0 0;font-size:14px;color:#0f172a;font-weight:600;">Marcos</p>
            <p style="margin:0;font-size:12px;color:#64748b;">Fundador, trefolio</p>
          </div>
        </td></tr>
${FOOTER}`,
    bodyText: "Your Pro trial is waiting\n\nHi {{display_name}}, you've been building your portfolio on trefolio — now experience the full toolkit for 7 days, completely free.\n\nActivate your free trial: {{base_url}}/trial/activate?token={{trial_token}}\n\nNo credit card required. After 7 days, your account returns to the Free plan — no surprises.\n\nI built trefolio because I wanted a better way to track my own portfolio. I hope you'll enjoy having the full experience.\n\nLet me know what you think — just reply to this email.\n\nMarcos\nFounder, trefolio",
    bodyTextEs: "Tu prueba Pro te espera\n\nHola {{display_name}}, has estado construyendo tu cartera en trefolio — ahora experimenta todas las herramientas durante 7 días, completamente gratis.\n\nActiva tu prueba gratuita: {{base_url}}/trial/activate?token={{trial_token}}\n\nSin tarjeta de crédito. Después de 7 días, tu cuenta vuelve al plan gratuito — sin sorpresas.\n\nCreé trefolio porque quería una mejor forma de seguir mi propia cartera. Espero que disfrutes la experiencia completa.\n\nCuéntame qué te parece — responde a este email.\n\nMarcos\nFundador, trefolio",
    category: "lifecycle",
    experienceLevel: "",
  },
  {
    slug: "trial-expired",
    name: "Trial — Pro Trial Ended",
    subject: "Your Trefolio Pro trial has ended",
    subjectEs: "Tu prueba de Trefolio Pro ha terminado",
    bodyHtml: `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Your Pro trial has ended</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">Hi {{display_name}}, your 7-day Trefolio Pro trial is over. Here&rsquo;s what you&rsquo;ll miss:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4CA;", "Advanced Analytics", "Sharpe ratio, max drawdown, volatility, and full growth history")}
            ${feature("&#x1F9E0;", "AI Analysis", "30 calls/day with deep stock insights and portfolio reviews")}
            ${feature("&#x1F4C8;", "Company Fundamentals", "Income statements, balance sheets, insider trades, and institutional holdings")}
            ${feature("&#x1F514;", "Premium Alerts", "WhatsApp notifications, unlimited alerts, and up to 5 portfolios")}
          </table>
          {{growth_box}}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td style="padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
            <p style="margin:0;font-size:14px;color:#1e40af;text-align:center;line-height:1.5;">Plans start at &euro;4.99/month. Cancel anytime.</p>
          </td></tr></table>
          ${cta("Subscribe to Trefolio Pro", "{{base_url}}/pricing")}
          ${ctaSecondary("View pricing", "{{base_url}}/pricing")}
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">I hope the trial gave you a real taste of what trefolio can do. If you have feedback, I&rsquo;d genuinely love to hear it.</p>
            <p style="margin:12px 0 0;font-size:14px;color:#0f172a;font-weight:600;">Marcos</p>
            <p style="margin:0;font-size:12px;color:#64748b;">Founder, trefolio</p>
          </div>
        </td></tr>
${FOOTER}`,
    bodyHtmlEs: `${HEADER}
        <tr><td style="padding:36px 32px 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Tu prueba Pro ha terminado</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;text-align:center;line-height:1.6;">Hola {{display_name}}, tu prueba de 7 d&iacute;as de Trefolio Pro ha terminado. Esto es lo que echar&aacute;s de menos:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${feature("&#x1F4CA;", "Anal&iacute;tica avanzada", "Ratio Sharpe, drawdown m&aacute;ximo, volatilidad e historial completo")}
            ${feature("&#x1F9E0;", "An&aacute;lisis IA", "30 consultas/d&iacute;a con insights profundos y revisiones de cartera")}
            ${feature("&#x1F4C8;", "Fundamentales", "Ingresos, balances, operaciones de insiders y posiciones institucionales")}
            ${feature("&#x1F514;", "Alertas premium", "Notificaciones WhatsApp, alertas ilimitadas y hasta 5 carteras")}
          </table>
          {{growth_box}}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td style="padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
            <p style="margin:0;font-size:14px;color:#1e40af;text-align:center;line-height:1.5;">Planes desde 4,99&euro;/mes. Cancela cuando quieras.</p>
          </td></tr></table>
          ${cta("Suscr\u00edbete a Trefolio Pro", "{{base_url}}/pricing")}
          ${ctaSecondary("Ver precios", "{{base_url}}/pricing")}
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.6;">Espero que la prueba te haya dado una idea real de lo que trefolio puede hacer. Si tienes feedback, me encantar&iacute;a escucharlo.</p>
            <p style="margin:12px 0 0;font-size:14px;color:#0f172a;font-weight:600;">Marcos</p>
            <p style="margin:0;font-size:12px;color:#64748b;">Fundador, trefolio</p>
          </div>
        </td></tr>
${FOOTER}`,
    bodyText: "Your Pro trial has ended\n\nHi {{display_name}}, your 7-day Trefolio Pro trial is over.\n\nHere's what you'll miss:\n- Advanced Analytics: Sharpe ratio, max drawdown, volatility\n- AI Analysis: 30 calls/day with deep stock insights\n- Company Fundamentals: income, balance sheets, insider trades\n- Premium Alerts: WhatsApp, unlimited alerts, up to 5 portfolios\n\nPlans start at €4.99/month. Cancel anytime.\n\nSubscribe: {{base_url}}/pricing\n\nI hope the trial gave you a real taste of what trefolio can do. If you have feedback, I'd genuinely love to hear it.\n\nMarcos\nFounder, trefolio",
    bodyTextEs: "Tu prueba Pro ha terminado\n\nHola {{display_name}}, tu prueba de 7 días de Trefolio Pro ha terminado.\n\nEsto es lo que echarás de menos:\n- Analítica avanzada: ratio Sharpe, drawdown máximo, volatilidad\n- Análisis IA: 30 consultas/día con insights profundos\n- Fundamentales de empresas: ingresos, balances, insiders\n- Alertas premium: WhatsApp, ilimitadas, hasta 5 carteras\n\nPlanes desde 4,99€/mes. Cancela cuando quieras.\n\nSuscríbete: {{base_url}}/pricing\n\nEspero que la prueba te haya dado una idea real de lo que trefolio puede hacer.\n\nMarcos\nFundador, trefolio",
    category: "lifecycle",
    experienceLevel: "",
  },
  ...featureTemplates,
  {
    slug: "referral-program",
    name: "Referral Program — Share & Earn",
    subject: "Share trefolio with friends \u2014 earn 30 days of Pro",
    subjectEs: "Comparte trefolio con amigos \u2014 gana 30 d\u00edas de Pro",
    bodyHtml: referralProgramHtml,
    bodyHtmlEs: referralProgramHtmlEs,
    bodyText: "Share trefolio, earn free Pro time\n\nLove using trefolio? Share it with friends and earn 30 days of Pro for every friend who signs up and verifies.\n\nHow it works:\n1. Share your personal referral link\n2. Your friend signs up and verifies their email\n3. You earn 30 days of Trefolio Pro (up to 365 days total)\n\nYour referral link: {{referral_link}}\n\nShare now: {{base_url}}/profile?section=referrals\n\nPro tip: Share on WhatsApp, Telegram, or X for maximum reach!",
    bodyTextEs: "Comparte trefolio, gana tiempo Pro gratis\n\n\u00bfTe encanta trefolio? Comp\u00e1rtelo con amigos y gana 30 d\u00edas de Pro por cada amigo que se registre y verifique.\n\nC\u00f3mo funciona:\n1. Comparte tu enlace personal de referido\n2. Tu amigo se registra y verifica su email\n3. Ganas 30 d\u00edas de Trefolio Pro (hasta 365 d\u00edas en total)\n\nTu enlace de referido: {{referral_link}}\n\nCompartir: {{base_url}}/profile?section=referrals\n\nConsejo: \u00a1Comparte en WhatsApp, Telegram o X para m\u00e1ximo alcance!",
    category: "feature",
    experienceLevel: "",
  },
];
