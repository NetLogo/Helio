import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'prisma/**/*.spec.ts', 'tests/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    alias: {
      '#src/': new URL('./src/', import.meta.url).pathname,
      '#tests/': new URL('./tests/', import.meta.url).pathname,
    },
  },
});
