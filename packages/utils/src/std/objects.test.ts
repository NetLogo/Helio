import { describe, expect, it } from "vitest";
import * as _Object from "./objects";

describe("Objects", () => {
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
