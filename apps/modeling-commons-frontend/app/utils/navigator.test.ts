// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "./navigator";

const originalClipboard = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");

function restoreClipboard() {
  if (originalClipboard) {
    Object.defineProperty(globalThis.navigator, "clipboard", originalClipboard);
  } else {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  }
}

afterEach(() => {
  restoreClipboard();
  vi.restoreAllMocks();
});

describe("copyTextToClipboard", () => {
  it("uses navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await copyTextToClipboard("hello");
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to document.execCommand when clipboard is unavailable", async () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", { configurable: true, value: () => false });
    const execSpy = vi.spyOn(document, "execCommand").mockReturnValue(true);

    await expect(copyTextToClipboard("hello")).resolves.toBeUndefined();
    expect(execSpy).toHaveBeenCalledWith("copy");
  });

  it("rejects when execCommand fallback returns false", async () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", { configurable: true, value: () => true });
    vi.spyOn(document, "execCommand").mockReturnValue(false);

    await expect(copyTextToClipboard("hello")).rejects.toThrow("Failed to copy text");
  });

  it("rejects with an explicit error for null input", async () => {
    await expect(copyTextToClipboard(null)).rejects.toThrow("No text provided to copy");
  });

  it("rejects with an explicit error for empty string input", async () => {
    await expect(copyTextToClipboard("")).rejects.toThrow("No text provided to copy");
  });
});
