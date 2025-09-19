import type { ProjectConfig } from '@repo/mustache';

export default {
  defaults: {
    language: 'en',
    output: false,
    inheritFrom: [0],
    extension: 'md',
    title: 'NetLogo User Manual',
    version: `7.0.0`,
  },
  projectRoot: '.',
  outputRoot: 'dist',
  scanRoot: 'autogen',
  engine: 'handlebars',
} as ProjectConfig;
