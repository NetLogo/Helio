import tailwindcss from '@tailwindcss/vite';

import { getDocumentedExtensionBuilders } from '@repo/netlogo-docs/extension-docs';
import { addNuxtContentAssetsRoot, getRoutes } from '@repo/netlogo-docs/helpers';

import autogenConfig from './lib/docs/autogen.config';
import * as MarkdownConfig from './lib/docs/markdown.config';
import runDocsAutogen from './lib/docs/runDocsAutogen';

import { publicEnvironmentVariables, verifyEnvironmentVariables } from './env.public';
import { vueUiSrc, vueUiStyles } from './turbo';

const basePath = process.env['BASE_PATH'] ?? '/';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  app: {
    baseURL: basePath,
    rootId: '__netlogo',
  },
  devtools: { enabled: true },
  ssr: true,
  // prettier-ignore
  modules: [
    '@nuxtjs/sitemap',             // Adds sitemap.xml
    '@repo/nuxt-content-assets',   // Local asset loading based on relative paths in Markdowns
    '@nuxt/content',               // Query, navigation, search, and rendering of Markdown files
    '@nuxt/ui',                    // Reka-UI library for Nuxt
    '@nuxt/icon',                  // Optimized icons with iconify
    'nuxt-svgo',                   // SVG loader from file
    '@nuxt/eslint',                // Linter
    'nuxt-gtag',                   // Google
    'nuxt-og-image',               // Dynamic Open Graph image generation
    'nuxt-link-checker',           // Link checking post-build
  ],
  site: { url: 'https://docs.netlogo.org', name: process.env['PRODUCT_NAME'] },
  css: ['~/assets/styles/main.scss', '~/assets/styles/tailwind.css', vueUiStyles],
  colorMode: {
    preference: 'light',
  },

  gtag: {
    id: 'G-ZET3KSPLMC',
  },

  imports: {
    autoImport: true,
    transform: {
      exclude: [/\bnode_modules\b/, /\b\.git\b/],
    },
  },

  $development: {
    experimental: {
      payloadExtraction: false,
    },
  },

  icon: {
    mode: 'css',
    cssLayer: 'base',
  },

  components: [
    {
      path: vueUiSrc,
      global: true,
      pattern: '**/*.vue',
      ignore: ['**/examples/*.vue', '**/tests/*.vue'],
      pathPrefix: false,
      watch: true,
    },
    {
      path: '~/components',
      global: true,
      pattern: '**/*.vue',
      ignore: ['**/examples/*.vue', '**/tests/*.vue'],
      pathPrefix: false,
      watch: true,
    },
  ],

  svgo: {
    customComponent: 'SvgImport',
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@repo/vue-ui', ...MarkdownConfig.externalImports],
    },
    server: {
      hmr: {
        overlay: true,
      },
      watch: { usePolling: true },
    },
  },

  content: {
    build: MarkdownConfig.buildOptions,
    renderer: {
      anchorLinks: false,
    },
    watch: { enabled: false },
  },

  contentAssets: {
    imageSize: 'style attrs',
    contentExtensions: 'md',
    debug: true,
    overrideStaticDimensions: false,
  },

  ogImage: {
    defaults: {
      extension: 'jpeg',
      sharp: {
        quality: 70,
      },
    },
  },

  linkChecker: {
    excludeLinks: ['/*.pdf', `${basePath}NetLogo_User_Manual.pdf`],
    skipInspections: ['no-baseless', 'no-underscores', 'trailing-slash'],
    report: {
      html: process.env['CHECK'] === 'true',
    },
  },

  runtimeConfig: {
    public: {
      extensions: (await getDocumentedExtensionBuilders(autogenConfig)).map((ext) => ({
        title: ext.fullName,
        href: `/${ext.name.toLowerCase()}`,
      })),
      ...publicEnvironmentVariables,
    },
  },

  hooks: {
    async ready() {
      verifyEnvironmentVariables();

      console.info(`[repo] Using @repo/vue-ui source path: ${vueUiSrc}`);
      console.info(`[repo] Using @repo/vue-ui styles path: ${vueUiStyles}`);

      const noAutogen = process.env['NO_AUTOGEN'] === 'true';
      if (noAutogen === true) return;
      await runDocsAutogen();
    },
    'content:file:beforeParse'(ctx) {
      addNuxtContentAssetsRoot(ctx.file);
    },
  },

  nitro: {
    static: true,
    serveStatic: true,
    baseURL: basePath,
    prerender: {
      autoSubfolderIndex: false,
      crawlLinks: true,
      concurrency: 1,
      routes: await getRoutes(),
    },
  },
});
