import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: ["apps/*/"] } },
  },
  { ignores: ["**/.next/**", "**/node_modules/**", "**/next-env.d.ts", ".claude/**"] },
];

export default eslintConfig;
