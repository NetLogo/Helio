import type { DefineNuxtConfig } from 'nuxt/config';
import { minify } from 'html-minifier-terser';
import { existsSync,  mkdirSync, writeFileSync } from 'node:fs';
import { rm,glob, } from 'node:fs/promises';

// The UnoCSS icon `@layer base` <style> block (~5KB) is inlined into every
// page, but the exact set of icons differs per page. Accumulate the union of
// icon rules across all prerendered routes here and emit a single shared
// icons.css in the nitro close() hook.
// -- Omar I. Jul 17 2026
const iconLayerRules = new Set<string>();

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

  vite: {
    css: {
      modules: {
        generateScopedName: '[hash:base64:4]'
      }
    }
  },

  nitro: {
    hooks: {
      async close() {
        const cwd = '.output/public'
        await rm(`${cwd}/__nuxt_content`, { recursive: true, force: true })
        await rm(`${cwd}/turtles.png`, { force: true })
        for await (const e of glob(['_nuxt/*.wasm', '_nuxt/*.js'], { cwd }))
          await rm(`${cwd}/${e}`, { force: true })

        
        const filesToDelete = [
          '_content/images/netlogo-logo.webp',
          '_content/images/banner-dark.webp',
          '_content/images/banner-with-code.webp',
          '_content/images/user-manual-logo.webp',
          '_content/images/interfacetab/plot-dialog.webp',
          '_content/images/codetab/separatecodetab.webp',
          '_content/images/nl7intro/start-interface-tab-light.webp',
          '_content/images/nl7intro/netlogopreferences.webp',
          '_content/images/nl7intro/modelspeedslider.webp',
          '_content/images/nl7intro/codetabpreferences.webp',
          '_content/images/infotab/Perspective Example.webp',
        ]

        for await (const e of glob(filesToDelete, { cwd }))
          await rm(`${cwd}/${e}`, { force: true })

        // Emit the shared icon stylesheet accumulated during prerendering.
        // Each page links to this instead of inlining its own copy.
        if (iconLayerRules.size) {
          const dir = `${cwd}/_nuxt`
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
          writeFileSync(`${dir}/icons.css`, `@layer base{${[...iconLayerRules].join('')}}`)
        }
      },
      'prerender:generate': async (route) => {
        if (!route.fileName?.endsWith('.html') || !route.contents) return

        const depth = route.route.split('/').filter(Boolean).length - 1
        const prefix = depth > 0 ? '../'.repeat(depth) : './'
        // remove the trailing slash since we already have 
        // a slash at the beginning of each path we want
        // to modify.
        // -- Omar I. Jul 13 2026
        const p = prefix.slice(0, -1)

        
        // Extract Nuxt UI colors from the HTML into a separate 
        // CSS file and replace the <style> tag with a <link> tag
        const m = route.contents.match(/<style id="nuxt-ui-colors">[\s\S]*?<\/style>/)
        if (m) {
          const dir = '.output/public/_nuxt'
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
          const cssPath = `${dir}/ui-colors.css`
          if (!existsSync(cssPath)) {
            writeFileSync(cssPath, m[0].replace(/^<style[^>]*>/, '').replace(/<\/style>$/, ''))
          }
          route.contents = route.contents.replace(
            m[0],
            `<link rel="stylesheet" href="${p}/_nuxt/ui-colors.css">`
          )
        }

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

        // Remove any empty class/style attributes
        route.contents = route.contents.replace(
          /\s+(class|style)="\s*"/g,
          ''
        )

        route.contents = await minify(route.contents, {
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: true,
          removeRedundantAttributes: true,
          removeAttributeQuotes: false,
          keepClosingSlash: true,
        })

        // Runs after minify() so the block is in its final minified form. 
        // The icon set differs per page, so collect each rule into the union 
        // set (written out in close()) and swap the inline block for a <link>.
        // -- Omar I. Jul 17 2026
        const icons = route.contents.match(/<style>@layer base\{[\s\S]*?<\/style>/)
        if (icons) {
          const body = icons[0].slice('<style>@layer base{'.length, -'}</style>'.length)
          for (const rule of body.match(/:where\([^)]*\)\{[^}]*\}/g) ?? [])
            iconLayerRules.add(rule)
          route.contents = route.contents.replace(
            icons[0],
            `<link rel="stylesheet" href="${p}/_nuxt/icons.css">`
          )
        }
      }
    }
  }
};

export default staticOverrides;