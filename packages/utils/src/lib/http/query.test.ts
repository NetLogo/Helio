import { describe, it, expect } from "vitest";
import {
  readArrayQueryParam,
  readBooleanQueryParam,
  readFirstQueryParam,
  readQueryParams,
} from "./query";

describe("readFirstQueryParam", () => {
  it("returns string values directly", () => {
    expect(readFirstQueryParam({ q: "hello" }, "q")).toBe("hello");
  });

  it("returns the first element of an array", () => {
    expect(readFirstQueryParam({ q: ["a", "b", "c"] }, "q")).toBe("a");
  });

  it("returns undefined for missing keys", () => {
    expect(readFirstQueryParam({}, "missing")).toBeUndefined();
  });

  it("returns undefined for explicit undefined", () => {
    expect(readFirstQueryParam({ q: undefined }, "q")).toBeUndefined();
  });

  it("returns undefined for empty arrays", () => {
    expect(readFirstQueryParam({ q: [] }, "q")).toBeUndefined();
  });
});

describe("readBooleanQueryParam", () => {
  it("parses 'true' as true", () => {
    expect(readBooleanQueryParam({ flag: "true" }, "flag")).toBe(true);
  });

  it("parses 'false' as false", () => {
    expect(readBooleanQueryParam({ flag: "false" }, "flag")).toBe(false);
  });

  it("returns undefined by default when missing", () => {
    expect(readBooleanQueryParam({}, "flag")).toBeUndefined();
  });

  it("returns the provided default when missing", () => {
    expect(readBooleanQueryParam({}, "flag", true)).toBe(true);
    expect(readBooleanQueryParam({}, "flag", false)).toBe(false);
  });

  it("returns the default for non-boolean strings", () => {
    expect(readBooleanQueryParam({ flag: "yes" }, "flag", false)).toBe(false);
    expect(readBooleanQueryParam({ flag: "1" }, "flag", true)).toBe(true);
  });

  it("is case-sensitive", () => {
    expect(readBooleanQueryParam({ flag: "True" }, "flag")).toBeUndefined();
    expect(readBooleanQueryParam({ flag: "TRUE" }, "flag")).toBeUndefined();
  });

  it("uses the first array element", () => {
    expect(readBooleanQueryParam({ flag: ["true", "false"] }, "flag")).toBe(true);
  });
});

describe("readArrayQueryParam", () => {
  const stringContent = { key: "tags", type: "string" } as const;
  const booleanContent = { key: "flags", type: "boolean" } as const;

  describe("string content", () => {
    it("returns [] when missing", () => {
      expect(readArrayQueryParam({}, "tags", stringContent)).toEqual([]);
    });

    it("returns [] for explicit undefined", () => {
      expect(readArrayQueryParam({ tags: undefined }, "tags", stringContent)).toEqual([]);
    });

    it("wraps a single string value", () => {
      expect(readArrayQueryParam({ tags: "foo" }, "tags", stringContent)).toEqual(["foo"]);
    });

    it("preserves an array", () => {
      expect(readArrayQueryParam({ tags: ["foo", "bar"] }, "tags", stringContent)).toEqual([
        "foo",
        "bar",
      ]);
    });

    it("preserves empty arrays", () => {
      expect(readArrayQueryParam({ tags: [] }, "tags", stringContent)).toEqual([]);
    });
  });

  describe("boolean content", () => {
    it("parses each element", () => {
      expect(
        readArrayQueryParam({ flags: ["true", "false", "true"] }, "flags", booleanContent),
      ).toEqual([true, false, true]);
    });

    it("does not yield undefined for unparseable elements", () => {
      expect(
        readArrayQueryParam({ flags: ["true", "nope", "false"] }, "flags", booleanContent),
      ).toEqual([true, false]);
    });

    it("wraps a single value", () => {
      expect(readArrayQueryParam({ flags: "true" }, "flags", booleanContent)).toEqual([true]);
    });

    it("returns [] when missing", () => {
      expect(readArrayQueryParam({}, "flags", booleanContent)).toEqual([]);
    });
  });
});

describe("readQueryParams", () => {
  describe("string", () => {
    it("returns the value when present", () => {
      expect(readQueryParams({ name: "alice" }, [{ key: "name", type: "string" }])).toEqual({
        name: "alice",
      });
    });

    it("returns undefined when missing without a default", () => {
      expect(readQueryParams({}, [{ key: "name", type: "string" }])).toEqual({
        name: undefined,
      });
    });

    it("returns the default when missing", () => {
      expect(
        readQueryParams({}, [{ key: "name", type: "string", defaultValue: "anonymous" }]),
      ).toEqual({ name: "anonymous" });
    });

    it("prefers the query value over the default", () => {
      expect(
        readQueryParams({ name: "alice" }, [
          { key: "name", type: "string", defaultValue: "anonymous" },
        ]),
      ).toEqual({ name: "alice" });
    });

    it("falls back to the default when the value is an empty array", () => {
      expect(
        readQueryParams({ name: [] }, [{ key: "name", type: "string", defaultValue: "anonymous" }]),
      ).toEqual({ name: "anonymous" });
    });
  });

  describe("boolean", () => {
    it("parses 'true' and 'false'", () => {
      expect(
        readQueryParams({ a: "true", b: "false" }, [
          { key: "a", type: "boolean" },
          { key: "b", type: "boolean" },
        ]),
      ).toEqual({ a: true, b: false });
    });

    it("returns undefined when missing without a default", () => {
      expect(readQueryParams({}, [{ key: "flag", type: "boolean" }])).toEqual({ flag: undefined });
    });

    it("returns the default when missing", () => {
      expect(readQueryParams({}, [{ key: "flag", type: "boolean", defaultValue: true }])).toEqual({
        flag: true,
      });
    });

    it("returns the default for unparseable values", () => {
      expect(
        readQueryParams({ flag: "maybe" }, [{ key: "flag", type: "boolean", defaultValue: false }]),
      ).toEqual({ flag: false });
    });
  });

  describe("array", () => {
    it("returns [] when missing (string content)", () => {
      expect(
        readQueryParams({}, [
          {
            key: "tags",
            type: "array",
            contentType: { key: "tags", type: "string" },
          },
        ]),
      ).toEqual({ tags: [] });
    });

    it("wraps a single string value", () => {
      expect(
        readQueryParams({ tags: "foo" }, [
          {
            key: "tags",
            type: "array",
            contentType: { key: "tags", type: "string" },
          },
        ]),
      ).toEqual({ tags: ["foo"] });
    });

    it("preserves array values", () => {
      expect(
        readQueryParams({ tags: ["foo", "bar"] }, [
          {
            key: "tags",
            type: "array",
            contentType: { key: "tags", type: "string" },
          },
        ]),
      ).toEqual({ tags: ["foo", "bar"] });
    });

    it("parses boolean array contents", () => {
      expect(
        readQueryParams({ flags: ["true", "false", "x"] }, [
          {
            key: "flags",
            type: "array",
            contentType: { key: "flags", type: "boolean" },
          },
        ]),
      ).toEqual({ flags: [true, false] });
    });
  });

  it("resolves multiple keys with mixed types in one call", () => {
    const query = {
      name: "alice",
      admin: "true",
      roles: ["editor", "viewer"],
      perms: ["true", "false"],
    };

    const result = readQueryParams(query, [
      { key: "name", type: "string" },
      { key: "admin", type: "boolean" },
      { key: "missingStr", type: "string", defaultValue: "fallback" },
      { key: "verbose", type: "boolean", defaultValue: false },
      {
        key: "roles",
        type: "array",
        contentType: { key: "roles", type: "string" },
      },
      {
        key: "perms",
        type: "array",
        contentType: { key: "perms", type: "boolean" },
      },
      {
        key: "empty",
        type: "array",
        contentType: { key: "empty", type: "string" },
      },
    ]);

    expect(result).toEqual({
      name: "alice",
      admin: true,
      missingStr: "fallback",
      verbose: false,
      roles: ["editor", "viewer"],
      perms: [true, false],
      empty: [],
    });
  });
});
