import { existsSync, readFileSync } from "fs";
import { join } from "path";

export function readSource(filePath: string): string | null {
  const fullPath = join(process.cwd(), filePath);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, "utf-8");
}

export function extractBacktickLiteral(source: string, startIdx: number): string | null {
  let i = startIdx;
  let result = "";
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      if (i + 1 >= source.length) break;
      const next = source[i + 1];
      if (next === "n") result += "\n";
      else if (next === "t") result += "\t";
      else if (next === "r") result += "\r";
      else result += next;
      i += 2;
      continue;
    }
    if (ch === "`") return result;
    result += ch;
    i++;
  }
  return null;
}

/** Extract `const NAME = \`...\`` or `export const NAME = \`...\``. */
export function extractConstTemplateLiteral(
  filePath: string,
  varName: string,
): string | null {
  const source = readSource(filePath);
  if (!source) return null;

  const pattern = new RegExp(
    `(?:export\\s+)?const\\s+${varName}\\s*=\\s*\``,
  );
  const match = pattern.exec(source);
  if (!match) return null;

  return extractBacktickLiteral(source, match.index + match[0].length);
}

/** Extract `marker = \`...\`` assignments (e.g. systemPrompt = `...`). */
export function extractAssignmentTemplateLiteral(
  filePath: string,
  marker: string,
  occurrence = 0,
): string | null {
  const source = readSource(filePath);
  if (!source) return null;

  const needle = `${marker} \``;
  let from = 0;
  for (let n = 0; n <= occurrence; n++) {
    const idx = source.indexOf(needle, from);
    if (idx < 0) return null;
    if (n === occurrence) {
      return extractBacktickLiteral(source, idx + needle.length);
    }
    from = idx + needle.length;
  }
  return null;
}

/** Replace common template placeholders for admin preview. */
export function previewTemplate(
  template: string,
  replacements: Record<string, string> = {},
): string {
  const defaults: Record<string, string> = {
    lang: "English",
    language: "English",
    companyName: "Example Corp",
    symbol: "EXMP",
    companyLabel: "Example Corp (EXMP)",
    baseCurrency: "EUR",
    cryptoLabel: "Bitcoin (BTC)",
    focusHint: "Focus especially on news sentiment and what the media narrative means for the stock.",
    hasPlan: "The user has NOT yet created a plan. Analyze their current allocation and drift.",
    ...replacements,
  };

  let out = template;
  for (const [key, value] of Object.entries(defaults)) {
    out = out.replaceAll(`\${${key}}`, value);
  }
  return out;
}
