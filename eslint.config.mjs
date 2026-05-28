import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.gen.ts",
      "**/*.gen.tsx",
      // Next.js generates next-env.d.ts with mandatory triple-slash refs.
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    // Node-runtime files: scripts/, root config, *.mjs / *.cjs at any level.
    // Without this, plain JS lints with no-undef tripping on `process`,
    // `console`, etc.
    files: ["scripts/**/*.{js,mjs,cjs}", "**/*.config.{js,mjs,cjs}", "*.{js,mjs,cjs}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
);
