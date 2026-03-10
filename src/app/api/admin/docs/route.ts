import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { readdir, readFile, stat } from "fs/promises";
import { join, relative } from "path";

const SUPPORTED_EXTENSIONS = [".html", ".md", ".csv", ".json", ".txt"];

interface DocEntry {
  name: string;
  path: string;
  dir: string;
  sizeKb: number;
  modifiedAt: string;
  type: string;
}

function getFileType(fileName: string): string | null {
  const ext = SUPPORTED_EXTENSIONS.find((e) => fileName.endsWith(e));
  return ext ? ext.slice(1) : null;
}

async function findDocFiles(baseDir: string, rootDir: string): Promise<DocEntry[]> {
  const entries: DocEntry[] = [];
  try {
    const items = await readdir(baseDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(baseDir, item.name);
      if (item.isDirectory() && !item.name.startsWith(".") && item.name !== "node_modules") {
        entries.push(...await findDocFiles(fullPath, rootDir));
      } else if (item.isFile()) {
        const fileType = getFileType(item.name);
        if (!fileType) continue;
        const fileStat = await stat(fullPath);
        const relPath = relative(rootDir, fullPath);
        const ext = "." + fileType;
        entries.push({
          name: item.name.endsWith(ext) ? item.name.slice(0, -ext.length) : item.name,
          path: relPath,
          dir: relative(rootDir, baseDir) || ".",
          sizeKb: Math.round(fileStat.size / 1024),
          modifiedAt: fileStat.mtime.toISOString(),
          type: fileType,
        });
      }
    }
  } catch { /* directory not accessible */ }
  return entries;
}

export const GET = withMetrics("/api/admin/docs", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const rootDir = process.cwd();
  const searchDirs = ["docs", "public", "lilygo-t4s3"];
  const allDocs: DocEntry[] = [];

  for (const dir of searchDirs) {
    allDocs.push(...await findDocFiles(join(rootDir, dir), rootDir));
  }

  allDocs.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

  return NextResponse.json({ docs: allDocs });
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function markdownToHtml(md: string): string {
  let html = escapeHtml(md);

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre style="background:#1e293b;color:#e2e8f0;padding:1rem;border-radius:8px;overflow-x:auto;font-size:0.85rem;line-height:1.5"><code>${code.trim()}</code></pre>`
  );
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;color:#0f172a;padding:0.15em 0.4em;border-radius:4px;font-size:0.9em">$1</code>');
  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:1.05rem;font-weight:700;margin:1.2rem 0 0.4rem">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1.15rem;font-weight:700;margin:1.4rem 0 0.5rem">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.35rem;font-weight:700;margin:1.8rem 0 0.6rem;border-bottom:1px solid #e2e8f0;padding-bottom:0.3rem">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.6rem;font-weight:800;margin:0 0 0.8rem">$1</h1>');
  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#6366f1;text-decoration:underline">$1</a>');
  // Unordered lists
  html = html.replace(/^[-*] (.+)$/gm, '<li style="margin:0.2rem 0">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul style="padding-left:1.5rem;margin:0.5rem 0">$1</ul>');
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin:0.2rem 0">$1</li>');
  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0">');
  // Paragraphs
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  html = html.replace(/<p>\s*(<h[1-4])/g, "$1").replace(/(<\/h[1-4]>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*(<pre)/g, "$1").replace(/(<\/pre>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*(<ul)/g, "$1").replace(/(<\/ul>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*(<hr[^>]*>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*<\/p>/g, "");

  return wrapInHtmlPage(html, "markdown");
}

function csvToHtml(csv: string): string {
  const lines = csv.trim().split("\n").map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
  if (lines.length === 0) return wrapInHtmlPage("<p>Empty file</p>", "csv");

  const [header, ...rows] = lines;
  const ths = header.map((h) => `<th style="padding:0.5rem 0.75rem;text-align:left;font-weight:600;border-bottom:2px solid #e2e8f0;white-space:nowrap">${escapeHtml(h)}</th>`).join("");
  const trs = rows.map((row) => {
    const tds = row.map((c) => `<td style="padding:0.4rem 0.75rem;border-bottom:1px solid #f1f5f9">${escapeHtml(c)}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("\n");

  const table = `<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:0.85rem"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  return wrapInHtmlPage(table, "csv");
}

function plainTextToHtml(text: string): string {
  return wrapInHtmlPage(`<pre style="white-space:pre-wrap;word-break:break-word;font-size:0.85rem;line-height:1.6">${escapeHtml(text)}</pre>`, "text");
}

function wrapInHtmlPage(body: string, type: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;padding:2rem;line-height:1.7;max-width:900px;margin:0 auto}
p{margin:0.5rem 0}
@media(prefers-color-scheme:dark){body{background:#0f172a;color:#e2e8f0}code{background:#334155!important;color:#e2e8f0!important}th{border-color:#334155!important}td{border-color:#1e293b!important}}
</style></head><body data-type="${type}">${body}</body></html>`;
}

export const POST = withMetrics("/api/admin/docs", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.path || typeof body.path !== "string") {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const safePath = body.path.replace(/\.\./g, "");
  const fileType = getFileType(safePath);
  if (!fileType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const fullPath = join(process.cwd(), safePath);
    const content = await readFile(fullPath, "utf-8");

    let html: string;
    switch (fileType) {
      case "html":
        html = content;
        break;
      case "md":
        html = markdownToHtml(content);
        break;
      case "csv":
        html = csvToHtml(content);
        break;
      default:
        html = plainTextToHtml(content);
        break;
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
});
