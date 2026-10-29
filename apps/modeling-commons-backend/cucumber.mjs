// https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md
// https://github.com/cucumber/cucumber-js/blob/main/docs/profiles.md

import { createRequire } from 'node:module';
import { useE2eDatabase } from './tests/support/e2e-database.ts';

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

// eslint-disable-next-line no-undef
const { options: cliOptions, configuration: cliConfiguration } = ArgvParser.parse(process.argv);

// Cucumber appends CLI paths to config paths, so the glob must step aside.
const cliPaths = cliConfiguration.paths;

// The data-integrity cohort reads the populated database it is pointed at, so only it keeps
// DATABASE_URL; every truncating run gets a database of its own.
if (!cliOptions.profile.includes('dataIntegrity')) {
  await useE2eDatabase();
}

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

export const sanity = { ...baseConfig, tags: `${baseConfig.tags} and @sanity` };

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
