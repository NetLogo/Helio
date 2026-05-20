import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useSearchParamsNavigation from "~/composables/shared/useSearchParamsNavigation";

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(async () => undefined),
}));

mockNuxtImport("navigateTo", () => navigateToMock);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSearchParamsNavigation", () => {
  it("falls back to '/' when no back/next query params are present", () => {
    const nav = useSearchParamsNavigation({ query: {} });
    expect(nav.links.value.back.href).toBe("/");
    expect(nav.links.value.next.href).toBe("/");
  });

  it("uses a custom fallback when provided", () => {
    const nav = useSearchParamsNavigation({ query: {}, fallback: "/home" });
    expect(nav.links.value.back.href).toBe("/home");
  });

  it("accepts internal absolute paths from the query", () => {
    const nav = useSearchParamsNavigation({
      query: { back: "/profile", next: "/welcome" },
    });
    expect(nav.links.value.back.href).toBe("/profile");
    expect(nav.links.value.next.href).toBe("/welcome");
  });

  it("rejects off-origin URLs and falls back", () => {
    const nav = useSearchParamsNavigation({
      query: { back: "https://evil.example/oops" },
      fallback: "/safe",
    });
    expect(nav.links.value.back.href).toBe("/safe");
  });

  it("allows URLs matching allowedOrigins, stripping the origin", () => {
    const nav = useSearchParamsNavigation({
      query: { next: "https://allowed.example/dashboard?x=1" },
      allowedOrigins: ["https://allowed.example"],
    });
    expect(nav.links.value.next.href).toBe("/dashboard?x=1");
  });

  it("goNext navigates to a sanitized URL when present", () => {
    const nav = useSearchParamsNavigation({ query: { next: "/dashboard" } });
    nav.goNext();
    expect(navigateToMock).toHaveBeenCalledWith("/dashboard");
  });

  it("goBack invokes navigateTo when a back URL is present", () => {
    const nav = useSearchParamsNavigation({ query: { back: "/previous" } });
    nav.goBack();
    expect(navigateToMock).toHaveBeenCalledWith("/previous");
  });
});
