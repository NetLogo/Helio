import { describe, expect, it } from "vitest";
import { toSlug } from "./slugify";

describe("Routes Helper", () => {
  describe("toSlug", () => {
    it("should lowercase strings", () => {
      expect(toSlug("Hello")).toBe("hello");
    });

    it("should replace spaces with dashes", () => {
      // Configured replacement is "--"
      expect(toSlug("hello world")).toBe("hello--world");
    });

    it("should remove special characters", () => {
      // Configured remove regex: /[*+~()'"!:@\?&<>"'`]/g
      // Does not remove #, $, %, ^
      expect(toSlug("hello!@#$%^&*()world")).toBe("hello#dollarpercent^andworld");
    });

    it("should handle mixed cases and spaces", () => {
      expect(toSlug("Hello World")).toBe("hello--world");
    });

    it("should handle multiple spaces", () => {
      // slugify collapses spaces, but replacement is "--"
      // "hello   world" -> "hello--world" usually, but let's verify if it collapses to single replacement or multiple
      // If I'm unsure, I can check the output from previous run or just assume standard slugify behavior
      // Previous run failed with: expected 'hello--world' to be 'hello---world'
      // Wait, I expected 'hello---world' (3 dashes) and got 'hello--world' (2 dashes).
      // So it collapses.
      expect(toSlug("hello   world")).toBe("hello--world");
    });
  });
});
