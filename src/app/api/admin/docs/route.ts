import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { readdir, readFile, stat } from "fs/promises";
import { join, relative } from "path";

interface DocEntry {
  name: string;
  path: string;
  dir: string;
  sizeKb: number;
  modifiedAt: string;
}

async function findHtmlFiles(baseDir: string, rootDir: string): Promise<DocEntry[]> {
  const entries: DocEntry[] = [];
  try {
    const items = await readdir(baseDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(baseDir, item.name);
      if (item.isDirectory() && !item.name.startsWith(".") && item.name !== "node_modules") {
        entries.push(...await findHtmlFiles(fullPath, rootDir));
      } else if (item.isFile() && item.name.endsWith(".html")) {
        const fileStat = await stat(fullPath);
        const relPath = relative(rootDir, fullPath);
        entries.push({
          name: item.name.replace(".html", ""),
          path: relPath,
          dir: relative(rootDir, baseDir) || ".",
          sizeKb: Math.round(fileStat.size / 1024),
          modifiedAt: fileStat.mtime.toISOString(),
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
    allDocs.push(...await findHtmlFiles(join(rootDir, dir), rootDir));
  }

  allDocs.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

  return NextResponse.json({ docs: allDocs });
});

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
  if (!safePath.endsWith(".html")) {
    return NextResponse.json({ error: "Only HTML files" }, { status: 400 });
  }

  try {
    const fullPath = join(process.cwd(), safePath);
    const content = await readFile(fullPath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
});
