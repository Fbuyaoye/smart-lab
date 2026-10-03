import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Resolve from the service root so both source-mode and compiled-mode startup
// load the same local .env file. Cloud hosts provide these values directly.
const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
