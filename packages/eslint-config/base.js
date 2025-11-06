import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {Array<import("eslint").Linter.Config>}
 * */
export default [
  {
    name: "javascript-eslint",
    rules: js.configs.recommended.rules,
    files: ["**.js", "**.cjs", "**.mjs"],
  },
  eslintConfigPrettier,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "**/*.test.{ts,tsx,js,jsx}", "**/__tests__/**"],
  },
];
