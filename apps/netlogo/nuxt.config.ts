// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ["@repo/nuxt-core/nuxt.config.ts"],
  devtools: {
    enabled: true,
  },
  ssr: true,
  runtimeConfig: {
    public: {
      backendUrl: process.env.PUBLIC_BACKEND_URL || "https://backend.netlogo.org",
    },
  },
  app: {
    head: {
      script: [
        {
          src: "https://unpkg.com/bsky-embed/dist/bsky-embed.es.js",
          type: "module",
        },
      ],
    },
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
  vue: {
    compilerOptions: {
      isCustomElement: (tag: string) => tag === "bsky-embed",
    },
  },
});
