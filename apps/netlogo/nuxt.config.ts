// https://nuxt.com/docs/api/configuration/nuxt-config
import { nuxtBaseConfig } from "@repo/nuxt-core/nuxt.config.ts";
import { deepMerge } from "@repo/utils/std/objects";
export default defineNuxtConfig(
  deepMerge(nuxtBaseConfig as Record<string, unknown>, {
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
    vue: {
      compilerOptions: {
        isCustomElement: (tag: string) => tag === "bsky-embed",
      },
    },
  }),
);
