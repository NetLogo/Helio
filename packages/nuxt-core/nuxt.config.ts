// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import { vueUiIconPack, vueUiSrc, vueUiStyles } from "./turbo";

import { getRoutes } from "@repo/netlogo-docs/helpers";

type NuxtBaseConfig = Parameters<typeof defineNuxtConfig>[0];

export const nuxtBaseConfig: NuxtBaseConfig = {
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  app: {
    rootId: "__netlogo",
  },
  modules: [
    "@nuxtjs/sitemap", // Adds sitemap.xml
    "@repo/nuxt-content-assets", // Local asset loading based on relative paths in Markdowns
    "@nuxt/content", // Query, navigation, search, and rendering of Markdown files
    "@nuxt/ui", // Reka-UI library for Nuxt
    "@nuxt/icon", // Optimized icons with iconify
    "@nuxt/fonts", // Font loading and optimization
    "@nuxt/eslint", // Linter
    "nuxt-svgo", // SVG loader from file
    "nuxt-gtag", // Google
    "nuxt-og-image", // Dynamic Open Graph image generation
    "nuxt-link-checker", // Link checking post-build
    "@nuxtjs/google-fonts", // Google Fonts
  ],

  colorMode: {
    preference: "light",
  },

  css: ["~/assets/styles/main.scss", "~/assets/styles/tailwind.css", vueUiStyles],

  imports: {
    autoImport: true,
    transform: {
      exclude: [/\bnode_modules\b/, /\b\.git\b/],
    },
  },

  $development: {
    experimental: {
      payloadExtraction: false,
    },
  },

  icon: {
    mode: "css",
    cssLayer: "base",
    customCollections: [
      {
        prefix: "netlogo",
        dir: vueUiIconPack,
      },
    ],
  },

  components: [
    {
      path: vueUiSrc,
      global: true,
      pattern: "**/*.vue",
      ignore: ["**/examples/*.vue", "**/tests/*.vue"],
      pathPrefix: false,
      watch: true,
    },
    {
      path: "~/components",
      global: true,
      pattern: "**/*.vue",
      ignore: ["**/examples/*.vue", "**/tests/*.vue"],
      pathPrefix: false,
      watch: true,
    },
  ],

  svgo: {
    customComponent: "SvgImport",
  },

  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
      "Fira+Code": [400, 500, 600, 700],
      Nunito: [400, 600, 700],
      "Maven Pro": [400, 500, 600, 700],
    },
  },

  build: {
    transpile: ["@repo/utils", "@repo/netlogo-docs"],
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["@repo/vue-ui", "@repo/utils", "@repo/netlogo-docs"],
    },
    build: {
      sourcemap: true,
    },
    server: {
      watch: { usePolling: true },
      hmr: true,
    },
  },

  content: {
    renderer: {
      anchorLinks: false,
    },
    watch: { enabled: false },
  },

  contentAssets: {
    imageSize: "style attrs",
    contentExtensions: "md",
    debug: true,
    overrideStaticDimensions: false,
  },

  mdc: {
    components: {
      prose: false,
    },
  },

  ui: {
    mdc: false,
    content: false,
  },

  ogImage: {
    defaults: {
      extension: "png",
    },
  },

  linkChecker: {
    excludeLinks: ["/*.pdf"],
    skipInspections: ["no-baseless", "no-underscores", "trailing-slash"],
    report: {
      html: process.env["CHECK"] === "true",
    },
  },

  hooks: {
    async ready() {
      console.info(`[repo] Using @repo/vue-ui source path: ${vueUiSrc}`);
      console.info(`[repo] Using @repo/vue-ui styles path: ${vueUiStyles}`);
      console.info(`[repo] Using @repo/vue-ui icon path: ${vueUiIconPack}`);
      console.info(
        `[repo] Using primitives.yaml from ${import.meta.resolve("@repo/common-data/datasets/primitives.yaml")}`,
      );

      const noAutogen = process.env["NO_AUTOGEN"] === "true";
      if (noAutogen === true) return;
    },
  },

  nitro: {
    static: true,
    serveStatic: true,
    prerender: {
      autoSubfolderIndex: false,
      crawlLinks: true,
      concurrency: 1,
      routes: await getRoutes(),
    },
  },
};

export default defineNuxtConfig(nuxtBaseConfig);
