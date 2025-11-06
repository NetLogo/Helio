/**
 * dirs and files to ignore
 *
 * Note: For this to work it has to be kept seperate from customRules. It cannot be combined with customRules above.
 *
 * @type {import('eslint').Linter.Config}
 */
const customIgnores = {
  ignores: [
    "**/node_modules",
    "**/public",
    "**/dist",
    "**/.nuxt",
    "**/primevue-presets",
    "**/.output",
    "**/.build",
    "**/.dist",
  ],
};

export { customIgnores };
