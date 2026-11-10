import { beforeAll, describe, expect, it, vi } from "vitest";

type RouteRules = Record<string, { ssr?: boolean }>;

let routeRules: RouteRules;

beforeAll(async () => {
  vi.stubGlobal("defineNuxtConfig", (config: unknown) => config);
  const config = (await import("~~/nuxt.config")).default as unknown as { routeRules: RouteRules };
  routeRules = config.routeRules;
});

const clientOnlyPatterns = () =>
  Object.entries(routeRules)
    .filter(([, rule]) => rule.ssr === false)
    .map(([pattern]) => pattern);

describe("client-only route rules", () => {
  // Nuxt marks every page under `/a/**` as client-only when a rule reads `/a/**/b`, so the
  // server renders an empty stub for pages the client renders in full.
  it("never puts a catch-all before another segment", () => {
    for (const pattern of clientOnlyPatterns()) {
      expect(pattern, pattern).not.toMatch(/\*\*\/./);
    }
  });

  it("keeps both model edit routes client-only", () => {
    expect(clientOnlyPatterns()).toEqual(
      expect.arrayContaining(["/models/*/edit", "/models/*/*/edit"]),
    );
  });
});
