import * as MarkdownConfig from "@repo/nuxt-core/markdown.config";
import {
  getCdnUrl,
  getConnectSrcAllowlist,
  getImageDomains,
  getImgSrcAllowlist,
} from "./app/utils/runtime-image";

const cdnUrl = getCdnUrl(process.env);
const imageDomains = getImageDomains(process.env);
const imgSrc = getImgSrcAllowlist(process.env);
const connectSrc = getConnectSrcAllowlist(process.env);

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
      cdnUrl,
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
    enabled: false,
    headers: {
      contentSecurityPolicy: {
        "img-src": imgSrc,
        "connect-src": connectSrc,
      },
      crossOriginEmbedderPolicy: false,
    },
  },

  turnstile: {
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
        file: "~/pages/models/[id]/index.vue",
      });

      pages.push({
        name: "model-slug-version",
        path: "/models/:slug/:id/versions/:versionNumber",
        file: "~/pages/models/[id]/index.vue",
      });

      pages.push({
        name: "model-version",
        path: "/models/:id/versions/:versionNumber",
        file: "~/pages/models/[id]/index.vue",
      });

      pages.push({
        name: "user-slug",
        path: "/users/:slug/:id",
        file: "~/pages/users/[id]/index.vue",
      });

      pages.push({
        name: "model-embed-slug",
        path: "/models/:slug/:id/embed",
        file: "~/pages/models/[id]/embed.vue",
      });

      pages.push({
        name: "model-edit-slug",
        path: "/models/:slug/:id/edit",
        file: "~/pages/models/[id]/edit.vue",
      });
    },
  },

  routeRules: {
    "/": {
      isr: 60 * 10,
      prerender: false,
    },
    "/models/**/embed": {
      security: {
        headers: {
          xFrameOptions: false,
          contentSecurityPolicy: {
            "frame-ancestors": ["*"],
          },
        },
      },
    },

    "/models/**/edit": {
      ssr: false,
    },

    "/models/upload": {
      ssr: false,
    },

    "/privacy": { isr: 60 * 60 },
    "/terms-of-service": { isr: 60 * 60 },
    "/cookies": { isr: 60 * 60 },
    "/about": { isr: 60 * 60 },
    "/donate": { isr: 60 * 60 },
  },

  vite: {
    server: {
      hmr: false,
    },
  },

  content: {
    build: MarkdownConfig.buildOptions,
    experimental: { nativeSqlite: true },
    database: {
      type: "sqlite",
      filename: ":memory:",
    },
  },

  mdc: {
    components: {
      prose: false,
    },
  },

  image: {
    domains: imageDomains,
    provider: "none",
    format: ["avif", "webp", "jpeg"],
    ipx: {
      // Avoid exposing name of internal binary
      // -Omar Ibrahim, Apr 20 26
      baseURL: "/_images",
    },
  },

  icon: {
    provider: "server",
    serverBundle: "local",
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
    prerender: {
      crawlLinks: false,
      routes: [],
    },
  },

  // @disable-after-beta
  sourcemap: {
    server: true,
    client: true,
  },
  logLevel: "verbose",
});
