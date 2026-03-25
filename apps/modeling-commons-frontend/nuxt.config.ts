// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ["@repo/nuxt-core/nuxt.config.ts"],

  ssr: true,

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api',
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
      global: true,
      pattern: "**/*.vue",
      ignore: ["**/examples/*.vue", "**/tests/*.vue"],
      pathPrefix: false,
      watch: true,
    },
  ],

  nitro: {
    prerender: {
      failOnError: false,
    },
  },
});
