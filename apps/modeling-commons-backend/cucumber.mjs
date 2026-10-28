// https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md
// https://github.com/cucumber/cucumber-js/blob/main/docs/profiles.md

import { createRequire } from 'node:module';

const { default: ArgvParser } = createRequire(import.meta.url)(
  '@cucumber/cucumber/lib/configuration/argv_parser',
);

// eslint-disable-next-line no-undef
const usingPerfProfile = process.argv.some(
  (arg, idx, all) => arg === '--profile' && all[idx + 1] === 'perf',
);

if (usingPerfProfile) {
  // eslint-disable-next-line no-undef
  process.env.CUCUMBER_TIMING = '1';
}

// Cucumber appends CLI paths to config paths, so the glob must step aside.
// eslint-disable-next-line no-undef
const cliPaths = ArgvParser.parse(process.argv).configuration.paths;

const baseTags = 'not @pending and not @wip and not @skip and not @data-integrity';

const baseConfig = {
  // Vitest specs may sit beside their subject in tests/support. Importing one
  // as cucumber support code runs describe() outside a test runner and kills
  // the whole run before any scenario starts.
  import: ['tests/support/**/!(*.spec).ts', 'tests/**/*.steps.ts'],
  paths: cliPaths ? [] : ['tests/**/*.feature'],
  format: [
    'json:reports/cucumber-report.json',
    'html:reports/index.html',
    'summary',
    'progress-bar',
    '@cucumber/pretty-formatter',
  ],
  // eslint-disable-next-line no-undef
  tags: process.env.E2E_MAILPIT ? baseTags : `${baseTags} and not @mailpit`,
  formatOptions: { snippetInterface: 'async-await' },
};

export default baseConfig;
export const perf = { ...baseConfig };

// Read-only invariant cohort. Runs against any populated environment and never
// truncates it, so it needs its own report paths to avoid overwriting a normal
// run's output.
export const dataIntegrity = {
  ...baseConfig,
  tags: '@data-integrity',
  format: [
    'json:reports/data-integrity-report.json',
    'html:reports/data-integrity.html',
    'summary',
    'progress-bar',
    '@cucumber/pretty-formatter',
  ],
};
