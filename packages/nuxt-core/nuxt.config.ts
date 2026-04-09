import { getRoutesSubset } from "@repo/netlogo-docs/helpers-node";
import tailwindcss from "@tailwindcss/vite";
import { websiteConfigSchema } from "./runtime.config.schema";
import { vueUiIconPack, vueUiSrc, vueUiStyles } from "./turbo";

type NuxtBaseConfig = Parameters<typeof defineNuxtConfig>[0];

const website = websiteConfigSchema.parse(process.env);

export const nuxtBaseConfig: NuxtBaseConfig = {
  extends: ["./layers/mdc", "./layers/primitive-tooltip"],

  compatibilityDate: "2025-07-15",
  app: {
    rootId: "__netlogo",
  },
  modules: [
    "@nuxt/devtools", // Nuxt Devtools for enhanced development experience
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

  site: { url: website.productWebsite, name: website.productName },

  css: ["~/assets/styles/main.scss", "~/assets/styles/tailwind.css", vueUiStyles],

  imports: {
    autoImport: true,
    transform: {
      exclude: [/\bnode_modules\b/, /\b\.git\b/],
    },
  },

  $development: {
    devtools: { enabled: true },

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
      pattern: "**/*.vue",
      ignore: ["**/examples/*.vue", "**/tests/*.vue"],
      pathPrefix: false,
      watch: true,
    },
    {
      path: "~/components",
      pattern: "**/*.vue",
      ignore: ["**/examples/*.vue", "**/tests/*.vue"],
      pathPrefix: false,
      watch: true,
    },
  ],

  ignore: [".build/", ".latest/", ".static/", ".preview/"],

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
      include: ["@repo/vue-ui", "@repo/utils", "@repo/netlogo-docs", "zod"],
      exclude: ["@repo/netlogo-docs/primitive-index", "@repo/utils/lib/server"],
    },

    build: {
      sourcemap: true,
      rollupOptions: {
        external: ["prismjs", "zod/locales", "zod/v4/locales"],
      },
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
    build: {
      markdown: {
        highlight: false,
        remarkPlugins: {
          "remark-emoji": false,
        },
      },
    },
    watch: { enabled: false },
  },

  contentAssets: {
    imageSize: "style attrs",
    contentExtensions: "md",
    debug: true,
    overrideStaticDimensions: false,
  },

  ui: {
    mdc: false,
    content: false,
    colorMode: false,
  },

  ogImage: {
    defaults: {
      extension: "jpeg",
      sharp: {
        quality: 70,
      },
    },
  },

  linkChecker:
    process.env.NUXT_BUILD_LINK_CHECKER === "0"
      ? { enabled: false }
      : {
          excludeLinks: ["/*.pdf"],
          skipInspections: [
            "no-baseless",
            "no-underscores",
            "trailing-slash",
            "absolute-site-urls",
            "no-uppercase-chars",
            "no-non-ascii-chars",
          ],
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
    },
  },

  runtimeConfig: {
    public: {
      website,
    },
  },

  nitro: {
    static: true,
    serveStatic: true,
    prerender: {
      autoSubfolderIndex: false,
      crawlLinks: process.env.NITRO_PRERENDER_CRAWL_LINKS === "0" ? false : true,
      concurrency: 1,
      routes: await getRoutesSubset(
        process.env.NITRO_PRERENDER_ROUTES?.split(",").map((route) => route.trim()) || [],
      ),
    },
  },
};

export default defineNuxtConfig(nuxtBaseConfig);
