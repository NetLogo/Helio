export const TEST_RUNTIME_CONFIG = {
  public: {
    apiBase: "http://api.test",
    authApiBase: "http://api.test/api/auth",
    appUrl: "http://app.test",
    storageBaseUrl: "http://storage.test",
    cdnUrl: "http://cdn.test",
  },
} as const;

// NOTE: do not add an installRuntimeConfigMock helper here.
// `mockNuxtImport` is a macro that only expands at the top level of a test file —
// calling it from inside a helper function is a no-op. Tests that need to override
// runtime config should inline `mockNuxtImport("useRuntimeConfig", (original) => ...)`
// using the (original) overlay pattern (see tests/nuxt/composables/useWebsite.test.ts),
// or just read the real config via useRuntimeConfig() inside `beforeEach` and assert against it.
