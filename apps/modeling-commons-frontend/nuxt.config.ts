// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ["@repo/nuxt-core/nuxt.config.ts"],

  ssr: true,

  app: {
    rootId: "__nuxt",
    layoutTransition: {
      name: "layout",
      mode: "out-in",
    },
    pageTransition: {
      name: "page",
      mode: "out-in",
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3000",
      authApiBase: process.env.NUXT_PUBLIC_AUTH_BASE || "http://localhost:3000/api",
      appUrl: process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3005",
    },
  },

  // prettier-ignore
  modules: [
    '@pinia/nuxt' ,                      // Pinia store
    'pinia-plugin-persistedstate/nuxt'
  ],

  routeRules: {
    "/": { swr: 300 },
    "/models": { swr: 120 },
    "/models/**": { swr: 3600 },
  },

  gtag: {
    id: "",
  },

  components: [
    {
      path: "~/components",
      pattern: "**/*.vue",
      ignore: ["**/examples/*.vue", "**/tests/*.vue"],
      pathPrefix: false,
      watch: true,
    },
  ],

  nitro: {
    static: false,
    serveStatic: true,
    prerender: {
      failOnError: false,
    },
  },
});
