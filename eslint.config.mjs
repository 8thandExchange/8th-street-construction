import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 22 pre-existing hits, all literal apostrophes and quotes in marketing
      // copy. Escaping them churns content files for identical rendered text;
      // the rule's real target (mistyped JSX) is rare enough to accept.
      "react/no-unescaped-entities": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Local prod builds write here (see next.config.mjs); generated output.
      ".next-build/**",
    ],
  },
];

export default eslintConfig;
