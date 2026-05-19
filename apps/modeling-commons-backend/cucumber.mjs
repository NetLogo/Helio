// https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md
// https://github.com/cucumber/cucumber-js/blob/main/docs/profiles.md

const usingPerfProfile = process.argv.some(
  (arg, idx, all) => arg === '--profile' && all[idx + 1] === 'perf',
);

if (usingPerfProfile) {
  process.env.CUCUMBER_TIMING = '1';
}

const baseConfig = {
  import: ['tests/support/**/*.ts', 'tests/**/*.steps.ts'],
  paths: ['tests/**/*.feature'],
  format: [
    'json:reports/cucumber-report.json',
    'html:reports/index.html',
    'summary',
    'progress-bar',
    '@cucumber/pretty-formatter',
  ],
  formatOptions: { snippetInterface: 'async-await' },
};

export default baseConfig;
export const perf = { ...baseConfig };
