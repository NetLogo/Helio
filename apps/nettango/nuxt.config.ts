// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ["@repo/nuxt-core/nuxt.config.ts"],
  app: {
    rootId: "__nettango",
  },
  ssr: true,

  // prettier-ignore
  modules: [
    "@nuxt/content",              // Markdown
    "@nuxt/hints",                // Development hints
    "@nuxt/image",                // Image optimization
  ],

  gtag: {},

  components: [
    {
      path: "~/components",
      pattern: "**/*.vue",
      ignore: ["**/examples/*.vue", "**/tests/*.vue"],
      pathPrefix: false,
      watch: true,
    },
  ],

  vite: {
    optimizeDeps: {
      exclude: ["@nuxt/hints"],
    },
  },

  linkChecker: {
    skipInspections: ["no-baseless", "no-underscores", "trailing-slash"],
  },

  nitro: {
    baseURL: "/",
    prerender: {
      routes: ["/"],
    },
  },
});
