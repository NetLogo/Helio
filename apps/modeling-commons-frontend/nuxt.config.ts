// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ["@repo/nuxt-core/nuxt.config.ts"],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3000",
    },
  },

  // prettier-ignore
  modules: [
    '@pinia/nuxt' ,                      // Pinia store
    'pinia-plugin-persistedstate/nuxt'
  ],

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
    prerender: {
      failOnError: false,
    },
  },
});
