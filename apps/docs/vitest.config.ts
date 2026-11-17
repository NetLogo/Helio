import { nuxtArtifactsVitestProject, nuxtE2EVitestProject } from "@repo/vitest-config/nuxt";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [await nuxtE2EVitestProject(), nuxtArtifactsVitestProject()],
  },
});
