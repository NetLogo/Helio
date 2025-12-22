import config from "@repo/eslint-config/base";
import typescriptConfig from "@repo/eslint-config/typescript";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    ...typescriptConfig,
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
];
