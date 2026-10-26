import * as MarkdownConfig from '@repo/nuxt-core/markdown.config';
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import models from "./app/data/models.json";
import { robotsText } from "./shared/utils/seo";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: [ "@repo/nuxt-core/nuxt.config.ts" ],
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
      ignore: [ "**/examples/*.vue", "**/tests/*.vue" ],
      pathPrefix: false,
      watch: true,
    },
  ],

  routeRules: {
    "/assets/models/**": { headers: { "Access-Control-Allow-Origin": "*" } },
  },

  experimental: {
    payloadExtraction: true,
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
      exclude: [ "@nuxt/hints" ],
    },
  },

  linkChecker: {
    skipInspections: [ "no-baseless", "no-underscores", "trailing-slash" ],
  },

  ogImage: {
    // The render cache under node_modules/.cache is keyed on the image options, not the template,
    // and CI restores node_modules; with no runtime to serve from, the cache only ever ships stale images.
    defaults: { cacheMaxAgeSeconds: 0 },
  },

  nitro: {
    baseURL: "/",
    prerender: {
      routes: [
        "/",
        "/models-library",
        "/llms.txt",
        ...models.map(({ id }) => `/models/${id}`),
      ],
    },
  },

  hooks: {
    // Static files are served ahead of server routes while prerendering, so the layer's
    // placeholder public/robots.txt would shadow a route; write the real one after the copy.
    "nitro:build:public-assets"(nitro) {
      const siteUrl = nitro.options.runtimeConfig.public.website.productWebsite;
      writeFileSync(
        join(nitro.options.output.publicDir, "robots.txt"),
        robotsText(new URL("/sitemap.xml", siteUrl).href),
      );
    },
  },
});
