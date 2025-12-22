import { describe, expect, it } from "vitest";
import type { DictionaryEntry } from "./types";
import {
  getEntryKind,
  getEntryNames,
  getEntryTitle,
  isConstantEntry,
  isSyntaxEntry,
} from "./utils";

describe("Dictionary Utils", () => {
  const syntaxEntry: DictionaryEntry = {
    id: "syntax-entry",
    icons: [],
    data: {
      syntax: [{ name: "syntax-name" }],
      description: "description",
      examples: [],
    },
  };

  const constantEntry: DictionaryEntry = {
    id: "constant-entry",
    icons: [],
    data: {
      title: "Constant Title",
      constants: [{ name: "constant-name" }],
    },
  };

  it("should identify syntax entries", () => {
    expect(isSyntaxEntry(syntaxEntry)).toBe(true);
    expect(isSyntaxEntry(constantEntry)).toBe(false);
  });

  it("should identify constant entries", () => {
    expect(isConstantEntry(constantEntry)).toBe(true);
    expect(isConstantEntry(syntaxEntry)).toBe(false);
  });

  it("should get entry kind", () => {
    expect(getEntryKind(syntaxEntry)).toBe("syntax");
    expect(getEntryKind(constantEntry)).toBe("constant");
  });

  it("should get entry title", () => {
    expect(getEntryTitle(syntaxEntry)).toBe("syntax-name");
    expect(getEntryTitle(constantEntry)).toBe("Constant Title");
  });

  it("should get entry names", () => {
    expect(getEntryNames(syntaxEntry)).toEqual(["syntax-name"]);
    expect(getEntryNames(constantEntry)).toEqual(["constant-name"]);
  });
});
