import { describe, expect, it } from "vitest";
import { prebuild } from "./prebuild";
import type { DictionaryType } from "./types";

describe("Dictionary Prebuild", () => {
  it("should organize entries into categories", () => {
    const dictionary: DictionaryType = {
      entries: [
        {
          id: "entry-1",
          icons: [],
          entry_categories: [{ id: "cat-1", title: "Category 1" }],
          data: {
            syntax: [{ name: "Entry 1" }],
            description: "desc",
            examples: [],
          },
        },
        {
          id: "entry-2",
          icons: [],
          entry_categories: [{ id: "cat-2", title: "Category 2" }],
          data: {
            title: "Entry 2",
            constants: [{ name: "Entry 2" }],
          },
        },
      ],
    };

    const result = prebuild(dictionary);

    expect(result.categories).toHaveLength(2);
    expect(result.categories.find((c) => c.id === "cat-1")?.entries).toHaveLength(1);
    expect(result.categories.find((c) => c.id === "cat-2")?.entries).toHaveLength(1);
  });

  it("should separate special categories", () => {
    const dictionary: DictionaryType = {
      entries: [
        {
          id: "entry-1",
          icons: [],
          entry_categories: [{ id: "constants", title: "Constants" }],
          data: {
            title: "Constant 1",
            constants: [{ name: "Constant 1" }],
          },
        },
      ],
    };

    const result = prebuild(dictionary);

    expect(result.categories).toHaveLength(0);
    expect(result.constants?.entries).toHaveLength(1);
  });
});
