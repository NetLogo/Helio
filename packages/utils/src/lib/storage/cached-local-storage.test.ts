import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CachedLocalStorage, wrapCacheLocalStorage } from "./cached-local-storage";

describe("CachedLocalStorage", () => {
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
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.stubGlobal("localStorage", undefined);
    vi.useRealTimers();
  });

  it("should set and get values", () => {
    const cache = new CachedLocalStorage<string>("test-key");
    cache.set("hello");
    expect(cache.get()).toBe("hello");
  });

  it("should return null if not set", () => {
    const cache = new CachedLocalStorage<string>("test-key");
    expect(cache.get()).toBeNull();
  });

  it("should expire after lifetime", () => {
    const cache = new CachedLocalStorage<string>("test-key", 1000);
    cache.set("hello");
    expect(cache.get()).toBe("hello");

    vi.advanceTimersByTime(1001);
    expect(cache.get()).toBeNull();
  });

  it("should not expire if lifetime is null", () => {
    const cache = new CachedLocalStorage<string>("test-key", null);
    cache.set("hello");
    vi.advanceTimersByTime(100000);
    expect(cache.get()).toBe("hello");
  });

  it("should delete value", () => {
    const cache = new CachedLocalStorage<string>("test-key");
    cache.set("hello");
    cache.delete();
    expect(cache.get()).toBeNull();
  });
});

describe("wrapCacheLocalStorage", () => {
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
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.stubGlobal("localStorage", undefined);
    vi.useRealTimers();
  });

  it("should return cached value if available", async () => {
    const fallback = vi.fn().mockResolvedValue("fallback");
    const wrapped = wrapCacheLocalStorage("test-key", 1000, fallback);

    // Pre-populate cache
    const cache = new CachedLocalStorage<string>("test-key");
    cache.set("cached");

    const result = await wrapped();
    expect(result).toBe("cached");
    expect(fallback).not.toHaveBeenCalled();
  });

  it("should call fallback if cache miss", async () => {
    const fallback = vi.fn().mockResolvedValue("fallback");
    const wrapped = wrapCacheLocalStorage("test-key", 1000, fallback);

    const result = await wrapped();
    expect(result).toBe("fallback");
    expect(fallback).toHaveBeenCalled();

    // Should populate cache asynchronously
    vi.runAllTimers();
    const cache = new CachedLocalStorage<string>("test-key");
    expect(cache.get()).toBe("fallback");
  });
});
