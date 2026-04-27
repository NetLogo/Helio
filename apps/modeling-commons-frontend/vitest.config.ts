import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";

const nuxtEnvironmentOptions = {
  nuxt: {
    dotenv: {
      fileName: ".env",
    },
  },
} as const;

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["app/**/*.{test,spec}.ts", "!app/components/**/*"],
          environment: "node",
        },
      },
      await defineVitestProject({
        test: {
          name: "components",
          include: ["app/components/**/*.{test,spec}.ts"],
          environment: "nuxt",
          environmentOptions: {
            ...nuxtEnvironmentOptions,
          },
        },
      }),
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["tests/nuxt/*.{test,spec}.ts"],
          environment: "nuxt",
          environmentOptions: {
            ...nuxtEnvironmentOptions,
          },
        },
      }),
      await defineVitestProject({
        test: {
          name: "bff",
          include: ["tests/bff/**/*.{test,spec}.ts"],
          environment: "nuxt",
          environmentOptions: {
            ...nuxtEnvironmentOptions,
          },
        },
      }),
      await defineVitestProject({
        test: {
          name: "e2e",
          include: ["tests/e2e/**/*.{test,spec}.ts"],
          environment: "nuxt",
          environmentOptions: {
            ...nuxtEnvironmentOptions,
          },
          // E2E tests are slow; bump the default timeout
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      }),
    ],
  },
});
