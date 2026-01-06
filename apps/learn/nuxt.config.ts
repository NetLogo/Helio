import tailwindcss from '@tailwindcss/vite';

import { addNuxtContentAssetsRoot, getRoutes } from '@repo/netlogo-docs/helpers';

import * as MarkdownConfig from './lib/docs/markdown.config';
import runDocsAutogen from './lib/docs/runDocsAutogen';

import { ProjectConfigSchema } from '@repo/template/schemas';
import path from 'node:path';
import { publicEnvironmentVariables, verifyEnvironmentVariables } from './env.public';
import autogenConfig from './lib/docs/autogen.config';
import { vueUiIconPack, vueUiSrc, vueUiStyles } from './turbo';

const basePath = process.env['BASE_PATH'] ?? '/';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  app: {
    rootId: '__netlogo',
    baseURL: basePath,
  },
  devtools: {
    enabled: true,
  },
  ssr: true,
  // prettier-ignore
  modules: [
    '@nuxtjs/sitemap',             // Adds sitemap.xml
    '@repo/nuxt-content-assets',   // Local asset loading based on relative paths in Markdowns
    '@nuxt/content',               // Query, navigation, search, and rendering of Markdown files
    '@nuxt/ui',                    // Reka-UI library for Nuxt
    '@nuxt/icon',                  // Optimized icons with iconify
    "@nuxt/fonts",                 // Font loading and optimization
    '@nuxt/eslint',                // Linter
    'nuxt-svgo',                   // SVG loader from file
    'nuxt-gtag',                   // Google
    'nuxt-og-image',               // Dynamic Open Graph image generation
    'nuxt-link-checker',           // Link checking post-build
    "@nuxtjs/google-fonts",        // Google Fonts
    '@pinia/nuxt' ,                // Pinia store
    'pinia-plugin-persistedstate/nuxt'
  ],

  site: { url: process.env['PRODUCT_WEBSITE'], name: process.env['PRODUCT_NAME'] },
  css: ['~/assets/styles/main.scss', '~/assets/styles/tailwind.css', vueUiStyles],
  colorMode: {
    preference: 'light',
  },

  gtag: {
    id: 'G-RD2ENT43JX',
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
    customCollections: [
      {
        prefix: 'netlogo',
        dir: vueUiIconPack,
      },
    ],
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

  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
      'Fira+Code': [400, 500, 600, 700],
      Nunito: [400, 600, 700],
      'Maven Pro': [400, 500, 600, 700],
    },
  },

  build: {
    transpile: ['@repo/utils', '@repo/netlogo-docs'],
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@repo/vue-ui', '@repo/utils', '@repo/netlogo-docs', ...MarkdownConfig.externalImports],
    },
    build: {
      sourcemap: true,
    },
    server: {
      watch: { usePolling: true },
      hmr: true,
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

  mdc: {
    components: {
      prose: false,
      map: {
        primitive: 'MDCPrimitive',
        a: 'ProseA',
        icon: 'MDCIcon',
        container: 'MDCContainer',
        errorBanner: 'MDCErrorBanner',
        button: 'MDCButton',
        netlogoCommand: 'NetLogoCommand',
      },
    },
  },

  ui: {
    mdc: false,
    content: false,
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
    excludeLinks: ['/*.pdf'],
    skipInspections: ['no-baseless', 'no-underscores', 'trailing-slash'],
    report: {
      html: process.env['CHECK'] === 'true',
    },
  },

  runtimeConfig: {
    public: {
      ...publicEnvironmentVariables,
    },
  },

  hooks: {
    async ready() {
      verifyEnvironmentVariables();

      console.info(`[repo] Using @repo/vue-ui source path: ${vueUiSrc}`);
      console.info(`[repo] Using @repo/vue-ui styles path: ${vueUiStyles}`);
      console.info(`[repo] Using @repo/vue-ui icon path: ${vueUiIconPack}`);
      console.info(
        `[repo] Using primitives.yaml from ${import.meta.resolve('@repo/common-data/datasets/primitives.yaml')}`,
      );

      const noAutogen = process.env['NO_AUTOGEN'] === 'true';
      if (noAutogen === true) return;

      await runDocsAutogen();
    },
    'content:file:beforeParse'(ctx) {
      const config = ProjectConfigSchema.parse(autogenConfig);
      const fallbackRoute = path.resolve(path.join(process.cwd(), config.scanRoot));
      addNuxtContentAssetsRoot(ctx.file, fallbackRoute);
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
