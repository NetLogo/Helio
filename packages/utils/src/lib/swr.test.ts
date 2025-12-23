import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageCache } from "./swr";

describe("LocalStorageCache", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    });
    // Mock Object.keys(localStorage) behavior roughly
    Object.defineProperty(global.localStorage, "length", {
      get: () => Object.keys(store).length,
    });
  });

  afterEach(() => {
    vi.stubGlobal("localStorage", undefined);
  });

  it("should set and get values", () => {
    const cache = new LocalStorageCache<number>();
    cache.set("key1", 123);
    expect(localStorage.setItem).toHaveBeenCalledWith("key1", "123");
    expect(cache.get("key1")).toBe(123);
  });

  it("should return undefined for missing keys", () => {
    const cache = new LocalStorageCache<number>();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("should return undefined for invalid JSON", () => {
    store["key1"] = "invalid json";
    const cache = new LocalStorageCache<number>();
    expect(cache.get("key1")).toBeUndefined();
  });

  it("should delete values", () => {
    const cache = new LocalStorageCache<number>();
    cache.set("key1", 123);
    cache.delete("key1");
    expect(localStorage.removeItem).toHaveBeenCalledWith("key1");
    expect(cache.get("key1")).toBeUndefined();
  });
});
