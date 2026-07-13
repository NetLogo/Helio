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

  nitro: {
    hooks: {
      'prerender:generate'(route) {
        if (!route.fileName?.endsWith('.html') || !route.contents) return

        const depth = route.route.split('/').filter(Boolean).length - 1
        const prefix = depth > 0 ? '../'.repeat(depth) : './'
        // remove the trailing slash since we already have 
        // a slash at the beginning of each path we want
        // to modify.
        // -- Omar I. Jul 13 2026
        const p = prefix.slice(0, -1)

        route.contents = route.contents.replace(
          /\b(src|href)="(\/[^"]*)"/g,
          (m, attr, val) => {
            if (val.startsWith('//')) return m
            if (attr === 'href') {
              const [path, ...rest] = val.split(/([?#])/)
              const qh = rest.join('')
              const target = path === '/' ? `${prefix}index.html${qh}` : `${p}${path}.html${qh}`
              return `${attr}="${target}"`
            }
            return `${attr}="${p}${val}"`
          }
        )
      }
    }
  }
};

export default staticOverrides;