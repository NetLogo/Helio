import config from "@repo/eslint-config/base";
import typescriptConfig, {
  noNeedProjectConfig as typescriptNoProjectConfig,
} from "@repo/eslint-config/typescript";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    ...typescriptConfig,
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: typescriptNoProjectConfig.rules,
  },
];
