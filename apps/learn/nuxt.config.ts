import { addNuxtContentAssetsRoot } from '@repo/netlogo-docs/helpers';

import * as MarkdownConfig from './lib/docs/markdown.config';
import runDocsAutogen from './lib/docs/runDocsAutogen';

import { ProjectConfigSchema } from '@repo/template/schemas';
import path from 'node:path';
import autogenConfig from './lib/docs/autogen.config';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['@repo/nuxt-core/nuxt.config.ts'],

  ssr: true,

  // prettier-ignore
  modules: [
    '@pinia/nuxt' ,                      // Pinia store
    'pinia-plugin-persistedstate/nuxt'
  ],

  gtag: {
    id: 'G-RD2ENT43JX',
  },

  components: [
    {
      path: '~/components',
      global: true,
      pattern: '**/*.vue',
      ignore: ['**/examples/*.vue', '**/tests/*.vue'],
      pathPrefix: false,
      watch: true,
    },
  ],

  vite: {
    optimizeDeps: {
      include: [...MarkdownConfig.externalImports],
    },
  },

  content: {
    build: MarkdownConfig.buildOptions,
  },

  hooks: {
    async ready() {
      if (process.env['NO_AUTOGEN'] !== 'true') {
        await runDocsAutogen();
      }
    },
    'content:file:beforeParse'(ctx) {
      const config = ProjectConfigSchema.parse(autogenConfig);
      const fallbackRoute = path.resolve(path.join(process.cwd(), config.scanRoot));
      addNuxtContentAssetsRoot(ctx.file, fallbackRoute);
    },
  },

  nitro: {
    prerender: {
      failOnError: false,
    },
  },
});
