#!/usr/bin/env node
/**
 * Builds knowledge/qa/trefolio-production-qa-test-cases.pdf
 * from production-user-test-catalog.md — agent-oriented DO / VERIFY cards.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "knowledge/qa/production-user-test-catalog.md");
const OUT_HTML = path.join(ROOT, "knowledge/qa/trefolio-production-qa-test-cases.html");
const OUT_PDF = path.join(ROOT, "knowledge/qa/trefolio-production-qa-test-cases.pdf");

function parseCatalog(md) {
  const headingRe = /^### (UC-[A-Z]+-\d+) — (.+)$/;
  const lines = md.split("\n");
  const blocks = [];
  let cur = null;

  for (const line of lines) {
    const hm = line.match(headingRe);
    if (hm) {
      if (cur) blocks.push(cur);
      cur = { id: hm[1], title: hm[2].trim(), lines: [] };
      continue;
    }
    if (cur) {
      if (/^## /.test(line) && !/^### /.test(line)) {
        blocks.push(cur);
        cur = null;
        continue;
      }
      cur.lines.push(line);
    }
  }
  if (cur) blocks.push(cur);

  return blocks.map((block) => {
    const fields = {};
    let currentKey = null;
    let buf = [];

    const flush = () => {
      if (currentKey != null) {
        fields[currentKey] = buf.join("\n").trim();
        currentKey = null;
        buf = [];
      }
    };

    for (const line of block.lines) {
      const fm = line.match(/^- \*\*([^*]+):\*\*\s*(.*)$/);
      if (fm) {
        flush();
        currentKey = fm[1];
        buf = [fm[2]];
      } else if (currentKey != null) {
        buf.push(line);
      }
    }
    flush();

    const pasosRaw = fields["Pasos"] || "";
    const steps = [...pasosRaw.matchAll(/^\s*\d+\.\s+(.+)$/gm)].map((m) => m[1].trim());

    return {
      id: block.id,
      title: block.title,
      domain: fields["Dominio / rutas"] || "",
      tier: fields["Tier / flags"] || "",
      risk: fields["Riesgo"] || "`safe`",
      preconditions:
        fields["Precondiciones"] ||
        fields["Setup overlays"] ||
        "Logged in if authenticated UC; see catalog preface.",
      steps: steps.length
        ? steps
        : [pasosRaw.replace(/\n+/g, " ").trim() || "See catalog."],
      expected: fields["Esperado"] || "",
      evidence: fields["Evidencia"] || "",
      passFail: fields["Pass / Fail / Skip"] || "",
    };
  });
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMd(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function buildHtml(cases) {
  const cards = cases
    .map((c, i) => {
      const steps = c.steps.map((s) => `<li>${inlineMd(s)}</li>`).join("\n");
      return `
<article class="card" id="${esc(c.id)}">
  <header>
    <div class="meta">
      <span class="num">${i + 1} / ${cases.length}</span>
      <span class="id">${esc(c.id)}</span>
      <span class="risk">${esc((c.risk || "safe").replace(/`/g, ""))}</span>
    </div>
    <h2>${esc(c.title)}</h2>
    <p class="domain">${inlineMd(c.domain)}</p>
    <p class="tier"><strong>Tier / flags:</strong> ${inlineMd(c.tier || "—")}</p>
  </header>

  <section class="block do">
    <h3>QUÉ HACER</h3>
    ${c.preconditions ? `<p class="pre"><strong>Precondiciones:</strong> ${inlineMd(c.preconditions)}</p>` : ""}
    <ol>${steps}</ol>
  </section>

  <section class="block verify">
    <h3>QUÉ VERIFICAR</h3>
    <p>${inlineMd(c.expected)}</p>
    <p class="passfail"><strong>Pass / Fail / Skip:</strong> ${inlineMd(c.passFail)}</p>
    <p class="evidence"><strong>Evidencia a capturar:</strong> ${inlineMd(c.evidence)}</p>
  </section>
</article>`;
    })
    .join("\n");

  const toc = cases
    .map(
      (c, i) =>
        `<li><a href="#${esc(c.id)}"><span class="toc-num">${i + 1}</span> ${esc(c.id)} — ${esc(c.title)}</a></li>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>trefolio — Production QA Test Cases (non-admin)</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "IBM Plex Sans", "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
  }
  .cover {
    page-break-after: always;
    padding: 24mm 8mm 0;
  }
  .cover h1 {
    font-size: 28pt;
    font-weight: 700;
    margin: 0 0 8pt;
    letter-spacing: -0.02em;
  }
  .cover .sub { font-size: 13pt; color: #444; margin-bottom: 28pt; }
  .cover dl { display: grid; grid-template-columns: 140px 1fr; gap: 6pt 12pt; font-size: 10.5pt; }
  .cover dt { font-weight: 600; color: #333; }
  .cover dd { margin: 0; }
  .rules {
    margin-top: 28pt;
    padding: 14pt;
    border: 1px solid #ccc;
    background: #f7f7f5;
  }
  .rules h2 { margin: 0 0 8pt; font-size: 12pt; }
  .rules ul { margin: 0; padding-left: 18pt; }
  .rules li { margin-bottom: 4pt; }
  .toc { page-break-after: always; }
  .toc h2 { font-size: 16pt; margin-bottom: 12pt; }
  .toc ol { columns: 2; column-gap: 18pt; padding-left: 0; list-style: none; }
  .toc li { break-inside: avoid; margin-bottom: 5pt; font-size: 9pt; }
  .toc a { color: #111; text-decoration: none; }
  .toc-num { display: inline-block; width: 22px; color: #666; }
  .card {
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #d0d0d0;
    margin: 0 0 14pt;
    padding: 0;
  }
  .card header {
    background: #111;
    color: #fff;
    padding: 10pt 12pt;
  }
  .card header h2 {
    margin: 4pt 0 2pt;
    font-size: 13pt;
    font-weight: 650;
  }
  .meta { display: flex; gap: 10pt; align-items: center; font-size: 8.5pt; opacity: 0.9; }
  .id { font-family: ui-monospace, Menlo, monospace; font-weight: 700; letter-spacing: 0.02em; }
  .risk {
    margin-left: auto;
    border: 1px solid rgba(255,255,255,0.45);
    padding: 1pt 6pt;
    border-radius: 2pt;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 8pt;
  }
  .domain, .tier { margin: 2pt 0 0; font-size: 9pt; opacity: 0.92; }
  .block { padding: 10pt 12pt; }
  .block.do { background: #f0f6ff; border-bottom: 1px solid #d0d0d0; }
  .block.verify { background: #f1faf1; }
  .block h3 {
    margin: 0 0 6pt;
    font-size: 9.5pt;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .block.do h3 { color: #0b4f8a; }
  .block.verify h3 { color: #1b6b2e; }
  .block ol { margin: 4pt 0 0; padding-left: 18pt; }
  .block li { margin-bottom: 3pt; }
  .pre { margin: 0 0 6pt; font-size: 9.5pt; }
  .passfail, .evidence { margin: 6pt 0 0; font-size: 9.5pt; }
  code {
    font-family: ui-monospace, Menlo, monospace;
    font-size: 9pt;
    background: rgba(0,0,0,0.06);
    padding: 0 3pt;
  }
  footer.page-foot {
    margin-top: 18pt;
    font-size: 8pt;
    color: #666;
    text-align: center;
  }
</style>
</head>
<body>
  <section class="cover">
    <h1>trefolio Production QA</h1>
    <p class="sub">Casos de prueba no-admin para agente · Qué hacer / Qué verificar</p>
    <dl>
      <dt>Entorno</dt><dd><code>https://trefolio.com</code> (IdP: <code>https://user.trefolio.com</code>)</dd>
      <dt>Cuenta</dt><dd><code>{{TEST_EMAIL}}</code> / <code>{{TEST_PASSWORD}}</code> (inyectadas por el humano)</dd>
      <dt>Casos</dt><dd>${cases.length} use cases (UC-PUB … UC-X)</dd>
      <dt>Fuente</dt><dd><code>knowledge/qa/production-user-test-catalog.md</code></dd>
      <dt>Reporte</dt><dd>Pass / Fail / Skip por ID + evidencia (screenshot o texto clave)</dd>
    </dl>
    <div class="rules">
      <h2>Instrucciones para el agente</h2>
      <ul>
        <li>Ejecutar cada caso en orden (o el subconjunto pedido). Marcar Pass / Fail / Skip.</li>
        <li>Tras login: dismiss cookies (Accept), What's New (Got it), theme tour (Skip).</li>
        <li><strong>Prohibido:</strong> borrar la cuenta, cancelar suscripción, completar pagos Stripe, OAuth de broker real (salvo instrucción), visitar <code>/admin</code>, spam en social.</li>
        <li>Mutaciones: solo reversibles (añadir y borrar holding/alert/watchlist de prueba).</li>
        <li>AI: preferir abrir panel; no quemar cuota con streams largos.</li>
        <li>Al final: entregar QA Report con resultados por UC.</li>
      </ul>
    </div>
  </section>

  <section class="toc">
    <h2>Índice</h2>
    <ol>${toc}</ol>
  </section>

  ${cards}

  <footer class="page-foot">trefolio · Production QA test cases · non-admin · ${cases.length} cases</footer>
</body>
</html>`;
}

async function main() {
  const md = fs.readFileSync(CATALOG, "utf8");
  const cases = parseCatalog(md);
  if (cases.length < 40) {
    console.error(`Expected ≥40 cases, got ${cases.length}`);
    process.exit(1);
  }
  const thin = cases.filter((c) => c.steps.length < 2);
  if (thin.length > 5) {
    console.warn(
      `Warning: ${thin.length} cases have <2 parsed steps:`,
      thin.slice(0, 5).map((c) => c.id).join(", "),
    );
  }

  const html = buildHtml(cases);
  fs.writeFileSync(OUT_HTML, html, "utf8");
  console.log(`Wrote ${OUT_HTML} (${cases.length} cases)`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${OUT_HTML}`, { waitUntil: "load" });
  await page.pdf({
    path: OUT_PDF,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
  });
  await browser.close();
  console.log(`Wrote ${OUT_PDF}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
