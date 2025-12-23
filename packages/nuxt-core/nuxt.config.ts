// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import { vueUiIconPack, vueUiSrc, vueUiStyles } from "./turbo";

import { getRoutes } from "@repo/netlogo-docs/helpers";

export default defineNuxtConfig({
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

  css: [vueUiStyles],

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
});
