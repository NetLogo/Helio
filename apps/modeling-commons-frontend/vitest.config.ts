import { fileURLToPath } from "node:url";
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
        resolve: {
          alias: [
            { find: "~~", replacement: fileURLToPath(new URL(".", import.meta.url)) },
            { find: "~", replacement: fileURLToPath(new URL("./app", import.meta.url)) },
            {
              find: /^@repo\/utils\/(.*)$/,
              replacement: fileURLToPath(new URL("../../packages/utils/dist/$1.js", import.meta.url)),
            },
          ],
        },
        test: {
          name: "unit",
          include: ["app/**/*.{test,spec}.ts", "!app/components/**/*"],
          environment: "node",
        },
      },
      {
        resolve: {
          alias: {
            "~": fileURLToPath(new URL("./app", import.meta.url)),
            "~~": fileURLToPath(new URL(".", import.meta.url)),
          },
        },
        define: {
          "import.meta.server": "true",
          "import.meta.client": "false",
        },
        test: {
          name: "ssr",
          include: ["tests/ssr/**/*.{test,spec}.ts"],
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
          include: ["tests/nuxt/**/*.{test,spec}.ts"],
          environment: "nuxt",
          environmentOptions: {
            ...nuxtEnvironmentOptions,
          },
          pool: "forks",
          maxWorkers: 1,
          minWorkers: 1,
          hookTimeout: 30_000,
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
