import { describe, expect, it } from "vitest";
import * as _String from "./string";

describe("String utilities", () => {
  it("camelCaseToKebabCase should convert camelCase to kebab-case", () => {
    expect(_String.camelCaseToKebabCase("camelCase")).toBe("camel-case");
    expect(_String.camelCaseToKebabCase("thisIsATest")).toBe("this-is-a-test");
    expect(_String.camelCaseToKebabCase("aBbC")).toBe("a-bb-c");
    expect(_String.camelCaseToKebabCase("simple")).toBe("simple");
  });

  it("isNonEmptyString should correctly identify non-empty strings", () => {
    expect(_String.isNonEmptyString("hello")).toBe(true);
    expect(_String.isNonEmptyString("")).toBe(false);
    expect(_String.isNonEmptyString(123)).toBe(false);
    expect(_String.isNonEmptyString(null)).toBe(false);
    expect(_String.isNonEmptyString(undefined)).toBe(false);
  });

  it("escapeHTML should escape special characters", () => {
    expect(_String.escapeHTML("<div>")).toBe("&lt;div&gt;");
    expect(_String.escapeHTML('"quote"')).toBe("&quot;quote&quot;");
    expect(_String.escapeHTML("'single'")).toBe("&#39;single&#39;");
    expect(_String.escapeHTML("&")).toBe("&amp;");
  });

  it("toSentenceCase should convert string to sentence case", () => {
    expect(_String.toSentenceCase("hello world")).toBe("Hello World");
    expect(_String.toSentenceCase("this is a test")).toBe("This Is A Test");
    expect(_String.toSentenceCase("")).toBe("");
  });
});
