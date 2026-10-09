import * as MarkdownConfig from '@repo/nuxt-core/markdown.config';

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

  routeRules: {
    "/assets/models/**": { headers: { "Access-Control-Allow-Origin": "*" } },
    "/models-v2/**": { redirect: { to: "/models/**", statusCode: 301 } },
  },

  icon: {
    // The model page shows these only after hydration (swapped panes, menus); bundling avoids a fetch and a blank icon.
    clientBundle: {
      icons: [
        "lucide:panel-left-open",
        "lucide:panel-left-close",
        "lucide:panel-right-open",
        "lucide:panel-right-close",
        "lucide:panel-top-open",
        "lucide:panel-top-close",
        "lucide:panel-bottom-open",
        "lucide:panel-bottom-close",
        "lucide:check",
        "lucide:images",
        "lucide:graduation-cap",
        "lucide:chevron-left",
        "lucide:chevron-right",
        "lucide:arrow-up-down",
      ],
    },
  },

  content: {
    build: MarkdownConfig.buildOptions,
  },

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
