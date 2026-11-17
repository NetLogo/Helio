import { defineVitestProject } from "@nuxt/test-utils/config";
import { fileURLToPath } from "node:url";
import type { AliasOptions } from "vite";
import type { TestRunnerConfig } from "vitest";

const nuxtAliases: AliasOptions = [
  { find: "~", replacement: fileURLToPath(new URL("./app", import.meta.url)) },
  { find: "~~", replacement: fileURLToPath(new URL(".", import.meta.url)) }
];

const nuxtEnvironmentOptions = {
  nuxt: {
    dotenv: {
      fileName: ".env",
    },
  },
} as const;


const nuxtUnitVitestProject = {
  resolve: {
    alias: [
      ...nuxtAliases,
      {
        find: /^@repo\/utils\/(.*)$/,
        replacement: fileURLToPath(
          new URL("../../packages/utils/dist/$1.js", import.meta.url),
        ),
      },
    ],
  },
  test: {
    name: "unit",
    include: [ "app/**/*.{test,spec}.ts", "!app/components/**/*" ],
    environment: "node",
  },
};

const nuxtSSRVitestProject = {
  resolve: {
    alias: [ ...nuxtAliases ]
  },
  define: {
    "import.meta.server": "true",
    "import.meta.client": "false",
  },
  test: {
    name: "ssr",
    include: [ "tests/ssr/**/*.{test,spec}.ts" ],
    environment: "node",
  },
}

const nuxtComponentsVitestProject = async (overrides: Partial<TestRunnerConfig> = {}) => await defineVitestProject({
  test: {
    name: "components",
    include: [ "app/components/**/*.{test,spec}.ts" ],
    environment: "nuxt",
    environmentOptions: {
      ...nuxtEnvironmentOptions,
    },
    ...overrides
  },
});

const nuxtEnvironmentVitestProject = async (overrides: Partial<TestRunnerConfig> = {}) => await defineVitestProject({
  test: {
    name: "nuxt",
    include: [ "tests/nuxt/**/*.{test,spec}.ts" ],
    environment: "nuxt",
    environmentOptions: {
      ...nuxtEnvironmentOptions,
    },
    pool: "forks",
    maxWorkers: 1,
    hookTimeout: 30_000,
    ...overrides
  },
});

// E2E tests drive a browser against a running server, so they need no Nuxt environment of their own.
const nuxtE2EVitestProject = (overrides: Partial<TestRunnerConfig> = {}) => ({
  test: {
    name: "e2e",
    include: [ "tests/e2e/**/*.{test,spec}.ts" ],
    environment: "node",
    testTimeout: 120_000,
    hookTimeout: 300_000,
    pool: "forks",
    maxWorkers: 1,
    ...overrides
  },
});

// Artifact tests inspect generated build output (.output, .build) and expect the matching build to have run first.
const nuxtArtifactsVitestProject = (overrides: Partial<TestRunnerConfig> = {}) => ({
  test: {
    name: "artifacts",
    include: [ "tests/artifacts/**/*.{test,spec}.ts" ],
    environment: "node",
    testTimeout: 120_000,
    ...overrides
  },
});

export {
  nuxtArtifactsVitestProject,
  nuxtComponentsVitestProject,
  nuxtE2EVitestProject,
  nuxtEnvironmentVitestProject,
  nuxtSSRVitestProject,
  nuxtUnitVitestProject
};
