import type { DefineNuxtConfig } from 'nuxt/config';

const staticOverrides: Parameters<DefineNuxtConfig>[0] = {
  app: {
    baseURL: "./",
    cdnURL: "./"
  },

  features: {
    'inlineStyles': true,
    'noScripts': true,
  },

  experimental: {
    'payloadExtraction': false,
  },

  runtimeConfig: {
    public: {
      isOffline: true,
    }
  },

  sitemap: { enabled: false },
  gtag: { enabled: false },
  ogImage: { enabled: false },
  linkChecker: { enabled: false },
};

export default staticOverrides;