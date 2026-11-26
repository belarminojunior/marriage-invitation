import path from "node:path";
import type { NextConfig } from "next";

// Monorepo root: lets Turbopack resolve the shared @wedding/core package.
// Env vars come from the root .env.local via @wedding/core's loadSharedEnv().
const monorepoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  turbopack: { root: monorepoRoot },
  serverExternalPackages: ["@googleapis/sheets"],
};

export default nextConfig;
