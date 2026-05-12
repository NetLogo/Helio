import { describe, expect, it } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useWebsite } from "~/composables/shared/useWebsite";

mockNuxtImport("useRuntimeConfig", (original) => {
  return ((...args: Parameters<typeof useRuntimeConfig>) => {
    const real = (original as typeof useRuntimeConfig)(...args);
    return {
      ...real,
      public: {
        ...(real.public ?? {}),
        website: {
          productName: "Modeling Commons",
          productDisplayName: "The Modeling Commons",
          productDescription: "Share NetLogo models",
          productLongDescription: "A long description",
          productWebsite: "https://example.test",
          productKeywords: ["netlogo", "models"],
        },
      },
    };
  }) as typeof useRuntimeConfig;
});

describe("useWebsite", () => {
  it("maps the runtime website config into the website ref shape", () => {
    const website = useWebsite();
    expect(website.value.name).toBe("Modeling Commons");
    expect(website.value.fullName).toBe("The Modeling Commons");
    expect(website.value.description).toBe("Share NetLogo models");
    expect(website.value.longDescription).toBe("A long description");
    expect(website.value.url).toBe("https://example.test");
    expect(website.value.keywords).toEqual(["netlogo", "models"]);
    expect(website.value.logo).toBeDefined();
  });
});
