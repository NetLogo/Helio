import { describe, expect, it, vi } from "vitest";
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import SearchBar from "./SearchBar.vue";

const { defineShortcutsMock } = vi.hoisted(() => ({
  defineShortcutsMock: vi.fn(),
}));

mockNuxtImport("defineShortcuts", () => defineShortcutsMock);

describe("SearchBar", () => {
  it("renders the input with placeholder", async () => {
    const wrapper = await mountSuspended(SearchBar);
    const input = wrapper.find("input");
    expect(input.exists()).toBe(true);
    expect(input.attributes("placeholder")).toBe("Discover 1,000+ models across subjects...");
  });

  it("registers a meta+k shortcut", async () => {
    defineShortcutsMock.mockClear();
    await mountSuspended(SearchBar);
    expect(defineShortcutsMock).toHaveBeenCalledTimes(1);
    const arg = defineShortcutsMock.mock.calls[0]![0];
    expect(arg).toHaveProperty("meta_k");
    expect(typeof arg.meta_k).toBe("function");
  });
});
