import { randomBytes } from "crypto";
import { appendFileSync, existsSync, readFileSync } from "fs";
import path from "path";

const SECRET_ENV_KEY = "APP_SESSION_SECRET";

let cachedSecret: string | null = null;

function getDotEnvPath(): string {
  return path.join(process.cwd(), ".env.local");
}

function readSecretFromEnvFile(): string | null {
  const envPath = getDotEnvPath();
  if (!existsSync(envPath)) return null;
  const content = readFileSync(envPath, "utf8");
  const line = content
    .split("\n")
    .find((row) => row.startsWith(`${SECRET_ENV_KEY}=`));
  if (!line) return null;
  const value = line.slice(`${SECRET_ENV_KEY}=`.length).trim();
  return value || null;
}

function persistSecretToEnv(secret: string) {
  const envPath = getDotEnvPath();
  const line = `${SECRET_ENV_KEY}=${secret}\n`;
  appendFileSync(envPath, existsSync(envPath) ? `\n${line}` : line, "utf8");
}

export function ensureSessionSecret(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env[SECRET_ENV_KEY]) {
    cachedSecret = process.env[SECRET_ENV_KEY] as string;
    return cachedSecret;
  }

  const fromEnvFile = readSecretFromEnvFile();
  if (fromEnvFile) {
    cachedSecret = fromEnvFile;
    return cachedSecret;
  }

  const generated = randomBytes(32).toString("hex");
  try {
    persistSecretToEnv(generated);
  } catch {
    // Continue with generated in-memory secret.
  }
  cachedSecret = generated;
  return cachedSecret;
}
