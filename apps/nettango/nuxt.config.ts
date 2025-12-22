import tailwindcss from "@tailwindcss/vite";
import { vueUIAssets, vueUiSrc, vueUiStyles } from "./turbo";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  app: {
    rootId: "__nettango",
  },
  devtools: { enabled: true },
  ssr: true,

  // prettier-ignore
  modules: [
    "@nuxtjs/sitemap",            // Adds sitemap.xml
    "@repo/nuxt-content-assets",  // Local asset loading based on relative paths in Markdowns
    "@nuxt/ui",                   // Reka-UI library for Nuxt
    "@nuxt/icon",                 // Optimized icons with iconify
    "@nuxt/fonts",                // Font loading and optimization
    "@nuxt/content",              // Markdown
    "@nuxt/hints",                // Development hints
    "@nuxt/eslint",               // Linter
    "@nuxt/image",                // Image optimization
    "@nuxt/ui",                   // UI components
    "nuxt-svgo",                  // SVG loader from file
    "nuxt-gtag",                  // Google
    "nuxt-og-image",              // Dynamic Open Graph image generation
    "nuxt-link-checker",          // Link checking post-build
    "@nuxtjs/google-fonts",       // Google Fonts
  ],

  site: { url: "https://nettangoweb.org", name: "NetTango" },
  css: ["~/assets/styles/main.scss", "~/assets/styles/tailwind.css", vueUiStyles],

  colorMode: {
    preference: "light",
  },

  gtag: {},

  imports: {
    autoImport: true,
    transform: {
      exclude: [/\bnode_modules\b/, /\b\.git\b/],
    },
  },

  icon: {
    mode: "css",
    cssLayer: "base",
    customCollections: [
      {
        prefix: "logo",
        dir: vueUIAssets,
        normalizeIconName: true,
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

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["@repo/vue-ui"],
      exclude: ["@nuxt/hints"],
    },
  },

  contentAssets: {
    imageSize: "style attrs",
    contentExtensions: "md",
    debug: true,
    overrideStaticDimensions: false,
  },

  ogImage: {
    defaults: {
      extension: "jpeg",
      sharp: {
        quality: 70,
      },
    },
  },

  linkChecker: {
    skipInspections: ["no-baseless", "no-underscores", "trailing-slash"],
    report: {
      html: process.env["CHECK"] === "true",
    },
  },

  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
      "Fira+Code": [400, 500, 600, 700],
      Nunito: [400, 600, 700],
      "Maven Pro": [400, 500, 600, 700],
    },
  },

  nitro: {
    static: true,
    serveStatic: true,
    prerender: {
      autoSubfolderIndex: false,
      crawlLinks: true,
      concurrency: 1,
      routes: ["/"],
    },
  },
});
