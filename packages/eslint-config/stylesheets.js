import css from "@eslint/css";

/**
 * @type {import('eslint').Linter.Config}
 */
const stylesheetsConfig = {
  files: ["**/*.css"],
  plugins: {
    // @ts-expect-error -- IGNORE --
    css,
  },
  language: "css/css",
  rules: {
    "css/no-duplicate-imports": "error",
  },
};

export { stylesheetsConfig };
