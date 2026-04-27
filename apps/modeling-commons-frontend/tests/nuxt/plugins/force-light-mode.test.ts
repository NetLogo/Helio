import { describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import forceLightModePlugin from "~/plugins/force-light-mode";

const { colorMode } = vi.hoisted(() => ({
  colorMode: { preference: "system", value: "system" },
}));

mockNuxtImport("useColorMode", () => () => colorMode);

function runPlugin(): Record<string, () => void> {
  const hooks: Record<string, () => void> = {};
  const fakeNuxt = {
    vueApp: {},
    hook: (name: string, handler: () => void) => {
      hooks[name] = handler;
    },
    hooks: { hook: vi.fn() },
    provide: vi.fn(),
    runWithContext: <T,>(fn: () => T) => fn(),
  } as unknown as Parameters<typeof forceLightModePlugin>[0];
  (forceLightModePlugin as unknown as (n: typeof fakeNuxt) => unknown)(fakeNuxt);
  return hooks;
}

describe("force-light-mode plugin", () => {
  it("registers an app:mounted hook that forces light mode", () => {
    colorMode.preference = "system";
    colorMode.value = "system";

    const hooks = runPlugin();

    expect(hooks["app:mounted"]).toBeDefined();
    hooks["app:mounted"]!();

    expect(colorMode.preference).toBe("light");
    expect(colorMode.value).toBe("light");
  });

  it("forces light even when the existing preference is 'dark'", () => {
    colorMode.preference = "dark";
    colorMode.value = "dark";

    const hooks = runPlugin();
    hooks["app:mounted"]!();

    expect(colorMode.preference).toBe("light");
    expect(colorMode.value).toBe("light");
  });

  it("forces light when system preference resolves to dark", () => {
    colorMode.preference = "system";
    colorMode.value = "dark";

    const hooks = runPlugin();
    hooks["app:mounted"]!();

    expect(colorMode.preference).toBe("light");
    expect(colorMode.value).toBe("light");
  });
});
