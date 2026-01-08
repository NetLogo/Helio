import { customIgnores } from "@repo/eslint-config/ignores";
import { customRulesVue } from "@repo/eslint-config/nuxt";

import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt()
  .append(customIgnores)
  .override("nuxt/vue/rules", {
    rules: {
      ...customRulesVue.rules,
    },
  })
  .override("nuxt/typescript/rules", {
    rules: {
      "@typescript-eslint/no-namespace": "off",
    },
  });
