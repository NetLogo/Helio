// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ["@repo/nuxt-core/nuxt.config.ts"],

  ssr: true,

  app: {
    rootId: "__nuxt",
    // layoutTransition: {
    //   name: "layout",
    //   mode: "out-in",
    // },
    // pageTransition: {
    //   name: "page",
    //   mode: "out-in",
    // },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE as string,
      authApiBase: process.env.NUXT_PUBLIC_AUTH_BASE as string,
      appUrl: process.env.NUXT_PUBLIC_APP_URL as string,
      adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL as string,
    },
  },

  // prettier-ignore
  modules: [// Pinia store
  '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', "@nuxt/image"],

  pinia: {
    storesDirs: ["./stores/**"],
  },

  routeRules: {
    "/": { swr: 300 },
    "/models": { swr: 120 },
    "/models/**": { swr: 3600 },
  },

  gtag: {
    id: "",
  },

  googleFonts: {
    families: {
      Epilogue: [400, 500, 600, 700],
    },
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