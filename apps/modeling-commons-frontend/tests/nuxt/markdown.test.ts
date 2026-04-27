import { describe, expect, it } from "vitest";
import { getFirstParagraphTextFromMarkdown } from "~/utils/markdown";

describe("getFirstParagraphTextFromMarkdown", () => {
  it("returns the text of the first paragraph, stripping bold/italic markers", async () => {
    const md = `# Heading

This is the **first** paragraph with *some* emphasis.

This is the second paragraph and should be ignored.`;
    const result = await getFirstParagraphTextFromMarkdown(md);
    expect(result).toContain("This is the");
    expect(result).toContain("first");
    expect(result).toContain("some");
    expect(result).not.toContain("second paragraph");
    expect(result).not.toContain("**");
    expect(result).not.toContain("*");
  });

  it("returns an empty string when there is no paragraph", async () => {
    const result = await getFirstParagraphTextFromMarkdown("# Just a heading");
    expect(result).toBe("");
  });
});
