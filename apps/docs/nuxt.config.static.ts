import type { DefineNuxtConfig } from 'nuxt/config';

const staticOverrides: Parameters<DefineNuxtConfig>[0] = {
  app: {
    baseURL: "./",
    cdnURL: "$CDN/",
  },

  features: {
    inlineStyles: false,
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


        // Transform absolute src/href attributes to relative paths
        route.contents = route.contents.replace(
          /\b(src|href)="((?:\$CDN\/|\/)[^"]*)"/g,
          (m, attr, val) => {
            const isCDN = val.startsWith('$CDN/')
            const clean = isCDN ? val.slice('$CDN'.length) : val   
            if (clean.startsWith('//')) return m

            if (attr === 'href') {
              const [path, ...rest] = clean.split(/([?#])/)
              const qh = rest.join('')
              const isAsset = /^\/_nuxt\//.test(path) || /\.[a-z0-9]+$/i.test(path)
              const suffix = (isCDN || isAsset) ? '' : '.html'
              const target = path === '/'
                ? `${prefix}index${suffix}${qh}`
                : `${p}${path}${suffix}${qh}`
              return `${attr}="${target}"`
            }

            return `${attr}="${p}${clean}"`
          }
        )

        // Remove crossorigin from stylesheet links 
        route.contents = route.contents.replace(
          /<link\b[^>]*>/g,
          (tag) =>
            /rel="stylesheet"/.test(tag)
              ? tag.replace(/\s+crossorigin(="[^"]*")?/g, '')
              : tag
        )

        // Remove any empty class attributes
        route.contents = route.contents.replace(
          /\s+class=""/g,
          ''
        )
      }
    }
  }
};

export default staticOverrides;