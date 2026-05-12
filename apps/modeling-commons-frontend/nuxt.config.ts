import * as MarkdownConfig from "@repo/nuxt-core/markdown.config";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ["@repo/nuxt-core/nuxt.config.ts"],

  ssr: true,

  app: {
    rootId: "__nuxt",
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE as string,
      authApiBase: process.env.NUXT_PUBLIC_AUTH_BASE as string,
      appUrl: process.env.NUXT_PUBLIC_APP_URL as string,
      adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL as string,
      storageBaseUrl: process.env.NUXT_STORAGE_BASE_URL as string,
    },
    turnstile: {
      secretKey: process.env.CAPTCHA_SECRET_KEY as string,
    },
  },

  // prettier-ignore
  modules: [
    "@nuxt/image",
    "@nuxt/test-utils/module",
    "nuxt-security",
    "@nuxtjs/turnstile",
  ],

  security: {
    enabled: process.env.NODE_ENV === "production",
  },

  turnstile: {
    enabled: process.env.CAPTCHA_SITE_KEY,
    siteKey: process.env.CAPTCHA_SITE_KEY as string,
  },

  gtag: {
    id: process.env.NUXT_PUBLIC_GA_TRACKING_ID || "",
  },

  googleFonts: {
    families: {
      Epilogue: [400, 500, 600, 700],
    },
  },

  imports: {
    autoImport: true,
    dirs: ["composables/**"],
  },

  hooks: {
    "pages:extend"(pages) {
      pages.push({
        name: "model-slug",
        path: "/models/:slug/:id",
        file: "~/pages/models/[id].vue",
      });

      pages.push({
        name: "model-slug-version",
        path: "/models/:slug/:id/versions/:versionNumber",
        file: "~/pages/models/[id].vue",
      });

      pages.push({
        name: "model-version",
        path: "/models/:id/versions/:versionNumber",
        file: "~/pages/models/[id].vue",
      });

      pages.push({
        name: "user-slug",
        path: "/users/:slug/:id",
        file: "~/pages/users/[id]/index.vue",
      });
    },
  },

  vite: {
    server: {
      hmr: false,
    },
  },

  content: {
    build: MarkdownConfig.buildOptions,
  },

  image: {
    domains: [
      process.env.NUXT_PUBLIC_STORAGE_BASE_URL,
      process.env.NUXT_PUBLIC_APP_URL,
      process.env.NUXT_PUBLIC_API_BASE,
      process.env.NUXT_PUBLIC_AUTH_BASE,
    ].filter((url): url is string => Boolean(url)),
    format: ["avif", "webp", "jpeg"],
    ipx: {
      // Avoid exposing name of internal binary
      // -Omar Ibrahim, Apr 20 26
      baseURL: "/_images",
    },
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

  typescript: {
    tsConfig: {
      include: ["../tests/**/*"],
    },
  },

  csurf: {
    https: process.env.NODE_ENV === "production",
  },

  linkChecker: { enabled: false },

  nitro: {
    static: false,
    serveStatic: true,
    prerender: false,
  },
});
