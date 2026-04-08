import { addNuxtContentAssetsRoot } from '@repo/netlogo-docs/helpers-node';
import type { DefineNuxtConfig } from 'nuxt/config';

import { getDocumentedExtensionBuilders } from '@repo/netlogo-docs/extension-docs';
import { deepMerge } from '@repo/utils/std/objects';

import pdfOverrides from './nuxt.config.pdf';
import { websiteConfigSchema } from './runtime.config';

import * as MarkdownConfig from '@repo/nuxt-core/markdown.config';
import autogenConfig from './lib/docs/autogen.config';
import runDocsAutogen from './lib/docs/runDocsAutogen';

type NuxtConfigInput = Parameters<DefineNuxtConfig>[0];
const basePath = process.env['BASE_PATH'] ?? '/';

const isUsingPdfConfig = process.env['DOCS_ENV_PDF'] === '1';
const optionalPdfLayer = isUsingPdfConfig ? pdfOverrides : {};

if (isUsingPdfConfig) {
  console.info('[repo] Running with PDF generation configuration overrides');
}

const extensions = (await getDocumentedExtensionBuilders(autogenConfig)).map((ext) => ({
  title: ext.fullName,
  href: `/${ext.name.toLowerCase()}`,
}));

export default defineNuxtConfig(
  deepMerge<NuxtConfigInput, NuxtConfigInput>(
    {
      extends: ['@repo/nuxt-core/nuxt.config.ts'],

      app: {
        baseURL: basePath,
      },

      ssr: true,

      routeRules:
        process.env.DOCS_USE_CLIENT_CATALOG === '1'
          ? {
              '/dict/**': { ssr: false, prerender: true },
              ...Object.fromEntries(extensions.map((ext) => [`${ext.href}/**`, { ssr: false, prerender: true }])),
            }
          : {},

      components: [
        {
          path: '~/components',
          pattern: '**/*.vue',
          ignore: ['**/examples/*.vue', '**/tests/*.vue'],
          pathPrefix: false,
          watch: true,
        },
      ],

      gtag: {
        id: 'G-ZET3KSPLMC',
      },

      vite: {
        optimizeDeps: {
          include: ['@repo/vue-ui', ...MarkdownConfig.externalImports],
        },
      },

      content: {
        build: MarkdownConfig.buildOptions,
      },

      linkChecker: {
        excludeLinks: ['/*.pdf', `${basePath}NetLogo_User_Manual.pdf`],
      },

      runtimeConfig: {
        public: {
          extensions,
          website: websiteConfigSchema.parse(process.env),
        },
      },

      hooks: {
        async ready() {
          if (process.env['NO_AUTOGEN'] !== 'true') {
            await runDocsAutogen();
          }
        },
        'content:file:beforeParse'(ctx) {
          addNuxtContentAssetsRoot(ctx.file);
        },
      },

      nitro: {
        static: true,
        serveStatic: true,
        baseURL: basePath,
      },
    },
    optionalPdfLayer,
    { mergeArrays: false },
  ),
);
