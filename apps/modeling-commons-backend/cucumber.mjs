// https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md
// https://github.com/cucumber/cucumber-js/blob/main/docs/profiles.md

// eslint-disable-next-line no-undef
const usingPerfProfile = process.argv.some(
  (arg, idx, all) => arg === '--profile' && all[idx + 1] === 'perf',
);

if (usingPerfProfile) {
  // eslint-disable-next-line no-undef
  process.env.CUCUMBER_TIMING = '1';
}

const baseConfig = {
  // Vitest specs may sit beside their subject in tests/support. Importing one
  // as cucumber support code runs describe() outside a test runner and kills
  // the whole run before any scenario starts.
  import: ['tests/support/**/!(*.spec).ts', 'tests/**/*.steps.ts'],
  paths: ['tests/**/*.feature'],
  format: [
    'json:reports/cucumber-report.json',
    'html:reports/index.html',
    'summary',
    'progress-bar',
    '@cucumber/pretty-formatter',
  ],
  tags: 'not @pending and not @wip and not @skip',
  formatOptions: { snippetInterface: 'async-await' },
};

export default baseConfig;
export const perf = { ...baseConfig };
