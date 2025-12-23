import { describe, expect, it } from "vitest";
import * as _Object from "./objects";

describe("Object Functor", () => {
  const obj = new _Object.ObjectFunctor({ a: 1, b: 2, c: 3 });

  it("mapValues should correctly map object values", () => {
    const result = obj.mapValues((_, value) => value * 2).get();
    expect(result).toEqual({ a: 2, b: 4, c: 6 });
  });

  it("mapKeys should correctly map object keys", () => {
    const result = obj.mapKeys((key) => `key_${key}`).get();
    expect(result).toEqual({ key_a: 1, key_b: 2, key_c: 3 });
  });

  it("map should correctly map object keys and values", () => {
    const result = obj.map((key, value) => [`new_${key}`, value + 1]).get();
    expect(result).toEqual({ new_a: 2, new_b: 3, new_c: 4 });
  });

  it("forEach should iterate over all key-value pairs", () => {
    const keys: string[] = [];
    const values: number[] = [];
    obj.forEach((key, value) => {
      keys.push(key as string);
      values.push(value as number);
    });
    expect(keys).toEqual(["a", "b", "c"]);
    expect(values).toEqual([1, 2, 3]);
  });

  it("get should return the original object", () => {
    expect(obj.get()).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe("Object Utilities", () => {
  it("isRecord should identify plain objects", () => {
    expect(_Object.isRecord({})).toBe(true);
    expect(_Object.isRecord({ a: 1 })).toBe(true);
    expect(_Object.isRecord([])).toBe(false);
    expect(_Object.isRecord(null)).toBe(false);
    expect(_Object.isRecord(42)).toBe(false);
    expect(_Object.isRecord("string")).toBe(false);
  });

  it("deepMerge should correctly merge two objects", () => {
    const obj1 = { a: 1, b: { x: 10, y: 20 } };
    const obj2 = { b: { y: 30, z: 40 }, c: 3 };
    const result = _Object.deepMerge(obj1, obj2);
    expect(result).toEqual({ a: 1, b: { x: 10, y: 30, z: 40 }, c: 3 });
  });

  it("deepMerge should correctly merge complex nested objects", () => {
    const obj1 = { a: { b: { c: 1, c2: [1, 2, 3] } }, d: 2, e: [1, 2, 3] };
    const obj2 = { a: { b: { c: 2, c3: 3 } }, d: { nested: true }, f: 4 };
    const result = _Object.deepMerge(obj1, obj2);
    expect(result).toEqual({
      a: { b: { c: 2, c2: [1, 2, 3], c3: 3 } },
      d: { nested: true },
      e: [1, 2, 3],
      f: 4,
    });
  });

  it("deepMerge should handle non-object values", () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 3, b: { nested: true } };
    const result = _Object.deepMerge(obj1, obj2);
    expect(result).toEqual({ a: 3, b: { nested: true } });
  });

  it("deepMerge merges arrays by concatenation", () => {
    const obj1 = { a: [1, 2], b: { x: [3] } };
    const obj2 = { a: [4, 5], b: { x: [6], y: [7] } };
    const result = _Object.deepMerge(obj1, obj2);
    expect(result).toEqual({ a: [1, 2, 4, 5], b: { x: [3, 6], y: [7] } });
  });

  it("deepMerge does not mutate input objects", () => {
    const obj1 = { a: 1, b: { x: 10 } };
    const obj2 = { b: { y: 20 } };
    const obj1Copy = JSON.parse(JSON.stringify(obj1));
    const obj2Copy = JSON.parse(JSON.stringify(obj2));
    _Object.deepMerge(obj1, obj2);
    expect(obj1).toEqual(obj1Copy);
    expect(obj2).toEqual(obj2Copy);
  });
});
