import { getRoutesSubset } from '@repo/netlogo-docs/helpers-node';
import type { DefineNuxtConfig } from 'nuxt/config';

const pdfOverrides: Parameters<DefineNuxtConfig>[0] = {
  routeRules: {
    '/**': { isr: 3600 },
  },

  linkChecker: {
    enabled: false,
  },

  sitemap: {
    enabled: false,
  },

  gtag: {
    enabled: false,
  },

  contentAssets: {
    debug: false,
  },

  ogImage: {
    defaults: {
      extension: 'png',
      width: 400,
      height: 600,
    },
  },

  nitro: {
    prerender: {
      autoSubfolderIndex: false,
      crawlLinks: false,
      concurrency: 20,
      routes: await getRoutesSubset(process.env.NITRO_PRERENDER_ROUTES?.split(',').map((route) => route.trim()) || []),
    },
  },
};

export default pdfOverrides;
