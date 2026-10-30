import * as MarkdownConfig from '@repo/nuxt-core/markdown.config';
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import curation from "./app/data/model-curation.json";
import models from "./app/data/models.json";
import { HomeSchema } from "./shared/schemas/home";
import { getModelPath } from "./shared/utils/routes";
import { buildRobotsText } from "./shared/utils/seo";

const listedModels = new Set(curation.groups.flatMap((group) => group.models));
const hiddenModelPaths = models.filter(({ id }) => !listedModels.has(id)).map(({ id }) => getModelPath(id));

export default defineNuxtConfig({
  extends: [ "@repo/nuxt-core/nuxt.config.ts" ],
  app: {
    rootId: "__nettango",
  },
  ssr: true,

  modules: [
    "@nuxt/content",
    "@nuxt/hints",
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

  fonts: {
    // Self-hosted variable faces: an entry with src replaces the layer's Google entry for Nunito, which stops at 700.
    families: [
      {
        name: "Nunito",
        src: "/fonts/nunito/nunito-latin.woff2",
        weight: "200 1000",
        global: true,
        unicodeRange: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
      },
      {
        name: "Nunito",
        src: "/fonts/nunito/nunito-latin-ext.woff2",
        weight: "200 1000",
        global: true,
        unicodeRange: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
      },
    ],
  },

  vite: {
    optimizeDeps: {
      exclude: [ "@nuxt/hints" ],
    },
  },

  // Hidden models keep their prerendered page for direct links but stay out of the sitemap.
  sitemap: {
    exclude: hiddenModelPaths,
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
        ...models.map(({ id }) => getModelPath(id)),
      ],
    },
  },

  hooks: {
    // Pages under /dev are design tools for the dev server only: no route, prerender, sitemap entry or link in a build.
    "pages:extend"(pages) {
      if (process.env.NODE_ENV === "development") return;
      const kept = pages.filter((page) => !page.path.startsWith("/dev"));
      pages.splice(0, pages.length, ...kept);
    },
    // Nuxt Content stores data files without checking them against the schema; failing the parse drops the file,
    // so the home page finds no content and the prerender stops on its error.
    "content:file:afterParse"({ collection, content }) {
      if (collection.name === "home") HomeSchema.parse(content);
    },
    // Static files are served ahead of server routes while prerendering, so the layer's
    // placeholder public/robots.txt would shadow a route; write the real one after the copy.
    "nitro:build:public-assets"(nitro) {
      const siteUrl = nitro.options.runtimeConfig.public.website.productWebsite;
      writeFileSync(
        join(nitro.options.output.publicDir, "robots.txt"),
        buildRobotsText(new URL("/sitemap.xml", siteUrl).href),
      );
    },
  },
});
