import { describe, expect, it } from "vitest";
import {
  areChoicesEqual,
  copyChoices,
  getCategoryIcon,
  getChangedPreferences,
  getPreferenceChoices,
} from "~/features/notification-preferences/mappers";

const saved = {
  "comment.on_your_model": { inApp: true, email: "immediate" },
  "comment.reply_to_you": { inApp: false, email: "off" },
} as const;

describe("getPreferenceChoices", () => {
  it("keeps only the choices of each category", () => {
    const categories = [
      { category: "comment.on_your_model", label: "L", description: "D", inApp: true, email: "daily" },
    ] as const;
    expect(getPreferenceChoices([...categories])).toEqual({
      "comment.on_your_model": { inApp: true, email: "daily" },
    });
  });
});

describe("getChangedPreferences", () => {
  it("lists only the fields that differ from the saved choices", () => {
    const draft = {
      "comment.on_your_model": { inApp: false, email: "immediate" },
      "comment.reply_to_you": { inApp: false, email: "daily" },
    } as const;
    expect(getChangedPreferences(draft, saved)).toEqual([
      { category: "comment.on_your_model", inApp: false },
      { category: "comment.reply_to_you", email: "daily" },
    ]);
  });

  it("is empty when nothing differs", () => {
    expect(getChangedPreferences(copyChoices(saved), saved)).toEqual([]);
  });
});

describe("areChoicesEqual", () => {
  it("compares by value, not identity", () => {
    expect(areChoicesEqual(copyChoices(saved), saved)).toBe(true);
    const draft = copyChoices(saved);
    draft["comment.reply_to_you"]!.inApp = true;
    expect(areChoicesEqual(draft, saved)).toBe(false);
  });
});

describe("getCategoryIcon", () => {
  it("reads the icon of each category", () => {
    expect(getCategoryIcon("comment.on_your_model")).toBe("i-lucide-message-square");
    expect(getCategoryIcon("comment.reply_to_you")).toBe("i-lucide-reply");
  });
});
