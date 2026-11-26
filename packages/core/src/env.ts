import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Both apps share one `.env.local` at the monorepo root. Next.js only reads env files from each
 * app's own folder, so this fills in any variable that is still missing from the root files.
 * Variables that are already set (an app-level .env file, or the hosting provider's settings) win.
 */
let loaded = false;

export function loadSharedEnv() {
  if (loaded) return;
  loaded = true;
  // On Vercel the variables come from the project settings; there is no root .env file to read.
  if (process.env.VERCEL) return;

  const root = findMonorepoRoot(/*turbopackIgnore: true*/ process.cwd());
  if (!root) return;

  for (const file of [".env.local", ".env"]) {
    const filePath = path.join(/*turbopackIgnore: true*/ root, file);
    if (!fs.existsSync(filePath)) continue;
    for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(filePath, "utf8")))) {
      if (process.env[key] === undefined || process.env[key] === "") process.env[key] = value;
    }
  }
}

function findMonorepoRoot(start: string): string | null {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(/*turbopackIgnore: true*/ dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        if (JSON.parse(fs.readFileSync(pkg, "utf8")).workspaces) return dir;
      } catch {
        // ignore unreadable package.json and keep walking up
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Minimal .env parser: KEY=value, optional quotes; "\n" inside double quotes becomes a newline. */
function parseEnv(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/.exec(line);
    if (!match) continue;
    let value = (match[2] ?? "").trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, "\n");
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    result[match[1]] = value;
  }
  return result;
}
