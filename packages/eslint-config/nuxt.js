import { noNeedProjectConfig } from "./typescript.js";

/**
 * @type {import('eslint').Linter.Config}
 */
const customRulesVue = {
  files: ["**/*.vue", "../../packages/vue-ui/src/**/*.vue"],
  rules: {
    "vue/multi-word-component-names": "off",
    "vue/no-use-v-if-with-v-for": "warn",
    "vue/max-attributes-per-line": ["error", { singleline: 5, multiline: 1 }],
    "vue/singleline-html-element-content-newline": "off",
    "vue/html-self-closing": "off",
    "vue/attributes-order": [
      "error",
      {
        order: [
          "DEFINITION",
          "LIST_RENDERING",
          "CONDITIONALS",
          "RENDER_MODIFIERS",
          "GLOBAL",
          ["UNIQUE", "SLOT"],
          "TWO_WAY_BINDING",
          "OTHER_DIRECTIVES",
          "OTHER_ATTR",
          "EVENTS",
          "CONTENT",
        ],
        alphabetical: false,
        sortLineLength: false,
      },
    ],
  },
};

/**
 * @type {import('eslint').Linter.Config}
 */
const nuxtTypescriptOverrides = {
  files: ["**/*.ts", "**/*.tsx", "**/*.vue"],
  plugins: noNeedProjectConfig.plugins,
  rules: noNeedProjectConfig.rules,
};

export { customRulesVue, nuxtTypescriptOverrides };
