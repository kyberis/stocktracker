/**
 * Renders static HTML mockups and saves 1280×800 PNGs to public/screenshots/.
 * Run: node scripts/capture-mcp-screenshots.mjs
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "screenshots");

const DARK = `
:root {
  color-scheme: dark;
  --bg: #0f172a;
  --surface: #1e293b;
  --border: #334155;
  --text: #f1f5f9;
  --text-muted: #cbd5e1;
  --text-faint: #94a3b8;
  --emerald: #10b981;
  --emerald-strong: #059669;
  --emerald-soft: rgba(16, 185, 129, 0.12);
  --emerald-border: rgba(16, 185, 129, 0.35);
  --danger: #ef4444;
  --code-bg: #0b1220;
  --code-fg: #e2e8f0;
  --card-inner-bg: rgba(0,0,0,0.25);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
a { color: var(--emerald); text-decoration: none; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
`;

const idpShell = (main) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>${DARK}
.page-shell { min-height: 100vh; display: flex; flex-direction: column; }
.admin-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; border-bottom: 1px solid var(--border); background: #0b1326;
}
.admin-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; }
.admin-tag {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-faint); background: var(--surface); border: 1px solid var(--border);
  padding: 2px 8px; border-radius: 999px;
}
.logo {
  width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg,#6ee7b7,#059669);
  display: grid; place-items: center; font-size: 14px; font-weight: 800; color: #0f172a;
}
.admin-actor { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text-muted); }
.btn-mini {
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
  border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: default;
}
.admin-main { flex: 1; display: flex; justify-content: center; padding: 32px 24px; }
.card {
  width: min(920px, 100%); background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 32px 36px; box-shadow: 0 12px 32px rgba(0,0,0,0.35);
}
.brand-center { text-align: center; margin-bottom: 8px; }
.brand-center .wordmark { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.brand-center .wordmark span { color: var(--emerald); }
.heading-stack h1 { margin: 0 0 10px; font-size: 28px; letter-spacing: -0.02em; }
.heading-stack p { margin: 0 0 8px; color: var(--text-muted); line-height: 1.55; font-size: 15px; }
.heading-stack .links { font-size: 14px; color: var(--text-faint); margin-top: 6px; }
.input {
  width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border);
  background: #0b1326; color: var(--text); font-size: 14px;
}
.dev-table-wrap { overflow: hidden; border: 1px solid var(--border); border-radius: 12px; }
.dev-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dev-table th {
  text-align: left; padding: 10px 12px; background: #0b1326; color: var(--text-faint);
  font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
}
.dev-table td { padding: 12px; border-top: 1px solid var(--border); color: var(--text-muted); }
.badge-active {
  display: inline-block; font-size: 11px; font-weight: 700; color: var(--emerald);
  background: var(--emerald-soft); border: 1px solid var(--emerald-border); padding: 2px 8px; border-radius: 999px;
}
.token-box {
  margin-bottom: 20px; padding: 16px; border-radius: 12px; background: var(--card-inner-bg);
  border: 1px solid var(--emerald-border);
}
.token-box h3 { margin: 0 0 6px; font-size: 15px; }
.token-box p { margin: 0 0 10px; font-size: 13px; color: var(--text-muted); }
.token-code {
  display: block; word-break: break-all; font-size: 12px; padding: 12px; border-radius: 8px;
  background: var(--code-bg); color: var(--code-fg); line-height: 1.5;
}
.btn-primary { background: var(--emerald); color: #052e1a; border: none; font-weight: 700; }
.legal { font-size: 12px; color: var(--text-faint); line-height: 1.5; margin-top: 22px; }
.url-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 10;
  background: #1a1f2e; border-bottom: 1px solid #2a3142; padding: 8px 16px;
  display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8;
}
.url-bar .dots { display: flex; gap: 6px; margin-right: 8px; }
.url-bar .dot { width: 10px; height: 10px; border-radius: 50%; }
.url-bar .address {
  flex: 1; background: #0f131d; border-radius: 8px; padding: 6px 12px; color: #e2e8f0;
  font-family: ui-monospace, monospace; font-size: 12px;
}
body { padding-top: 42px; }
</style>
</head>
<body>
<div class="url-bar">
  <div class="dots">
    <span class="dot" style="background:#ff5f57"></span>
    <span class="dot" style="background:#febc2e"></span>
    <span class="dot" style="background:#28c840"></span>
  </div>
  <div class="address">user.trefolio.com/account/developer?from=trefolio</div>
</div>
<div class="page-shell">
  <header class="admin-topbar">
    <div class="admin-brand">
      <div class="logo">t</div>
      <span class="brand-name">trefolio</span>
      <span class="admin-tag">account</span>
    </div>
    <div class="admin-actor">
      <span>marcos@example.com</span>
      <button type="button" class="btn-mini">Sign out</button>
    </div>
  </header>
  <main class="admin-main">
    <div class="card">
      <div class="brand-center"><div class="wordmark">tre<span>folio</span></div></div>
      ${main}
    </div>
  </main>
</div>
</body>
</html>`;

const step1Main = `
<div class="heading-stack" style="text-align:center;margin-bottom:24px">
  <h1>AI &amp; MCP access</h1>
  <p>One personal access token works across <strong>trefolio</strong>, <strong>Clara</strong>, and <strong>Will</strong>.
  Paste it into your MCP client as <code>Authorization: Bearer …</code> for each app's MCP URL.</p>
  <p class="links"><a href="#">Passkeys</a> · <a href="#">trefolio.com</a></p>
</div>
<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-bottom:20px">
  <label style="flex:1 1 200px">
    <span style="display:block;font-size:13px;margin-bottom:4px;color:var(--text-muted)">Label</span>
    <input class="input" value="Claude / Cursor" readonly />
  </label>
  <button type="button" class="btn-mini btn-primary">Create token</button>
</div>
<h2 style="font-size:18px;margin:0 0 8px">Your tokens</h2>
<div class="dev-table-wrap">
  <table class="dev-table">
    <thead><tr><th>Label</th><th>Prefix</th><th>Created</th><th>Last used</th><th>Status</th><th></th></tr></thead>
    <tbody>
      <tr>
        <td style="color:var(--text)">Cursor laptop</td>
        <td><code>tfp_pat_8f3a…</code></td>
        <td>2026-06-12</td>
        <td>2026-06-18</td>
        <td><span class="badge-active">Active</span></td>
        <td><button class="btn-mini" style="color:var(--danger);border-color:#7f1d1d">Revoke</button></td>
      </tr>
    </tbody>
  </table>
</div>
<p class="legal">Anyone with this token can act as you in connected MCP tools. Revoke tokens you no longer trust.</p>`;

const step2Main = `
<div class="heading-stack" style="text-align:center;margin-bottom:24px">
  <h1>AI &amp; MCP access</h1>
  <p>One personal access token works across <strong>trefolio</strong>, <strong>Clara</strong>, and <strong>Will</strong>.</p>
</div>
<div class="token-box">
  <h3>Copy your token now</h3>
  <p>This is the only time it is shown. Store it in your MCP client (Cursor, Claude Desktop, etc.).</p>
  <code class="token-code">tfp_pat_a7c9e2f41b8063d5e9a2c4f8b1d0e6a7c9e2f41b8063d5e9a2c4f8b1d0e6a</code>
  <div style="margin-top:12px">
    <button type="button" class="btn-mini btn-primary">Copy to clipboard</button>
    <button type="button" class="btn-mini" style="margin-left:8px">Dismiss</button>
  </div>
</div>
<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-bottom:20px;opacity:0.55">
  <label style="flex:1 1 200px">
    <span style="display:block;font-size:13px;margin-bottom:4px;color:var(--text-muted)">Label</span>
    <input class="input" value="Claude Code" readonly />
  </label>
  <button type="button" class="btn-mini">Create token</button>
</div>
<h2 style="font-size:18px;margin:0 0 8px">Your tokens</h2>
<div class="dev-table-wrap">
  <table class="dev-table">
    <thead><tr><th>Label</th><th>Prefix</th><th>Created</th><th>Last used</th><th>Status</th><th></th></tr></thead>
    <tbody>
      <tr>
        <td style="color:var(--text)">Claude Code</td>
        <td><code>tfp_pat_a7c9…</code></td>
        <td>2026-06-19</td>
        <td>—</td>
        <td><span class="badge-active">Active</span></td>
        <td><button class="btn-mini" style="color:var(--danger);border-color:#7f1d1d">Revoke</button></td>
      </tr>
      <tr>
        <td style="color:var(--text)">Cursor laptop</td>
        <td><code>tfp_pat_8f3a…</code></td>
        <td>2026-06-12</td>
        <td>2026-06-18</td>
        <td><span class="badge-active">Active</span></td>
        <td><button class="btn-mini" style="color:var(--danger);border-color:#7f1d1d">Revoke</button></td>
      </tr>
    </tbody>
  </table>
</div>`;

const cursorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
* { box-sizing: border-box; }
body {
  margin: 0; font-family: "SF Pro Text", Inter, system-ui, sans-serif;
  background: #181818; color: #cccccc; height: 100vh; overflow: hidden;
}
.titlebar {
  height: 38px; background: #1e1e1e; border-bottom: 1px solid #2d2d2d;
  display: flex; align-items: center; padding: 0 14px; gap: 8px; font-size: 12px; color: #888;
}
.titlebar .dots { display: flex; gap: 7px; margin-right: 10px; }
.titlebar .dot { width: 11px; height: 11px; border-radius: 50%; }
.layout { display: flex; height: calc(100vh - 38px); }
.sidebar {
  width: 220px; background: #181818; border-right: 1px solid #2d2d2d; padding: 12px 0; font-size: 12px;
}
.sidebar .section { padding: 6px 16px; color: #858585; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.sidebar .file { padding: 5px 16px 5px 28px; color: #ccc; display: flex; align-items: center; gap: 6px; }
.sidebar .file.active { background: #2a2d2e; color: #fff; }
.sidebar .file .icon { opacity: 0.7; font-size: 10px; }
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.tabs {
  display: flex; background: #252526; border-bottom: 1px solid #2d2d2d; height: 36px; align-items: flex-end; padding-left: 8px;
}
.tab {
  padding: 8px 16px; font-size: 12px; background: #1e1e1e; border: 1px solid #2d2d2d; border-bottom: none;
  border-radius: 6px 6px 0 0; color: #fff;
}
.editor {
  flex: 1; display: flex; font-family: "JetBrains Mono", ui-monospace, Menlo, monospace; font-size: 13px; line-height: 1.6;
}
.gutter { width: 48px; background: #1e1e1e; color: #6e7681; text-align: right; padding: 16px 8px; user-select: none; }
.code { flex: 1; padding: 16px; background: #1e1e1e; overflow: hidden; }
.k { color: #569cd6; } .s { color: #ce9178; } .p { color: #d4d4d4; } .c { color: #6a9955; }
.panel {
  width: 300px; background: #181818; border-left: 1px solid #2d2d2d; padding: 16px; font-size: 12px;
}
.panel h3 { margin: 0 0 12px; font-size: 13px; color: #fff; font-weight: 600; }
.mcp-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px;
  background: #252526; border: 1px solid #3c3c3c; margin-bottom: 8px;
}
.mcp-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.6); }
.mcp-name { font-weight: 600; color: #fff; }
.mcp-status { font-size: 11px; color: #10b981; }
.path-label { font-size: 11px; color: #858585; margin-top: 16px; margin-bottom: 6px; }
.path { font-family: ui-monospace, monospace; font-size: 11px; color: #9cdcfe; word-break: break-all; }
</style>
</head>
<body>
<div class="titlebar">
  <div class="dots">
    <span class="dot" style="background:#ff5f57"></span>
    <span class="dot" style="background:#febc2e"></span>
    <span class="dot" style="background:#28c840"></span>
  </div>
  Cursor — ~/.cursor/mcp.json
</div>
<div class="layout">
  <aside class="sidebar">
    <div class="section">Explorer</div>
    <div class="file"><span class="icon">📁</span> .cursor</div>
    <div class="file active"><span class="icon">📄</span> mcp.json</div>
    <div class="file"><span class="icon">📄</span> settings.json</div>
    <div class="section" style="margin-top:16px">MCP</div>
    <div class="file active"><span class="icon">⚡</span> trefolio</div>
  </aside>
  <div class="main">
    <div class="tabs"><div class="tab">mcp.json</div></div>
    <div class="editor">
      <div class="gutter">1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>10<br>11<br>12</div>
      <div class="code"><span class="p">{</span>
  <span class="k">"mcpServers"</span><span class="p">: {</span>
    <span class="k">"trefolio"</span><span class="p">: {</span>
      <span class="k">"url"</span><span class="p">: </span><span class="s">"https://trefolio.com/api/mcp/user/mcp"</span><span class="p">,</span>
      <span class="k">"headers"</span><span class="p">: {</span>
        <span class="k">"Authorization"</span><span class="p">: </span><span class="s">"Bearer tfp_pat_a7c9e2f4…"</span>
      <span class="p">}</span>
    <span class="p">}</span>
  <span class="p">}</span>
<span class="p">}</span></div>
    </div>
  </div>
  <aside class="panel">
    <h3>MCP Servers</h3>
    <div class="mcp-item">
      <span class="mcp-dot"></span>
      <div>
        <div class="mcp-name">trefolio</div>
        <div class="mcp-status">Connected · 8 tools</div>
      </div>
    </div>
    <div class="path-label">Config file</div>
    <div class="path">~/.cursor/mcp.json</div>
    <div class="path-label" style="margin-top:12px">Endpoint</div>
    <div class="path">https://trefolio.com/api/mcp/user/mcp</div>
  </aside>
</div>
</body>
</html>`;

const shots = [
  { name: "mcp-step-1-developer.png", html: idpShell(step1Main) },
  { name: "mcp-step-2-token.png", html: idpShell(step2Main) },
  { name: "mcp-step-4-cursor.png", html: cursorHtml },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

for (const { name, html } of shots) {
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(OUT, name), type: "png" });
  console.log("wrote", name);
}

await browser.close();
console.log("Done → public/screenshots/");
