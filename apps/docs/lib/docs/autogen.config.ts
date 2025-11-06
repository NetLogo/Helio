import { appendAssetsRootToMetadata } from '@repo/netlogo-docs/helpers';
import type { ProjectConfig } from '@repo/template';

const autogenConfig: ProjectConfig = {
  defaults: {
    language: 'en',
    output: false,
    inheritFrom: [0],
    extension: 'md',
    title: 'NetLogo User Manual',
    version: process.env['PRODUCT_VERSION'],
  },
  projectRoot: '.',
  outputRoot: 'content',
  scanRoot: 'autogen',
  engine: 'handlebars',
  version: process.env['PRODUCT_VERSION'],
  metadata: {
    enabled: true,
    kind: 'prepend',
    prepend: {
      separator: '---',
      format: 'yaml',
    },
    transform: appendAssetsRootToMetadata,
  },
  locale: {
    toSlug: ({ language, defaultLanguage, slug }: { language: string; defaultLanguage: string; slug: string }) =>
      language !== defaultLanguage ? `${language}/${slug}` : slug,
  },
  dedupeIdenticalDiskWrites: true,
};

export default autogenConfig;
