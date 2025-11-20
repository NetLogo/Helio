import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "coverage/", "**/*.d.ts", "**/*.config.*", "**/index.ts"],
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
