import { describe, expect, it } from "vitest";
import * as _Array from "./array";

describe("Array utilities", () => {
  it("dropWhile should remove elements from the start of the array as long as the predicate returns true", () => {
    const result = _Array.dropWhile([1, 2, 3, 4], (n) => n < 3);
    expect(result).toEqual([3, 4]);
  });

  it("dropWhile should return an empty array if all elements match the predicate", () => {
    const result = _Array.dropWhile([1, 2, 3], (n) => n < 5);
    expect(result).toEqual([]);
  });

  it("dropWhile should return the original array if no elements match the predicate", () => {
    const result = _Array.dropWhile([1, 2, 3], (n) => n > 5);
    expect(result).toEqual([1, 2, 3]);
  });

  it("takeWhile should return elements from the start of the array as long as the predicate returns true", () => {
    const result = _Array.takeWhile([1, 2, 3, 4], (n) => n < 3);
    expect(result).toEqual([1, 2]);
  });

  it("takeWhile should return the original array if all elements match the predicate", () => {
    const result = _Array.takeWhile([1, 2, 3], (n) => n < 5);
    expect(result).toEqual([1, 2, 3]);
  });

  it("takeWhile should return an empty array if no elements match the predicate", () => {
    const result = _Array.takeWhile([1, 2, 3], (n) => n > 5);
    expect(result).toEqual([]);
  });

  it("groupBy should group elements by the key returned from the key function", () => {
    const result = _Array.groupBy(["apple", "banana", "apricot", "blueberry"], (s) => s.charAt(0));
    expect(result).toEqual({
      a: ["apple", "apricot"],
      b: ["banana", "blueberry"],
    });
  });

  it("mapBy should create a map from the array using the key function", () => {
    const result = _Array.mapBy(["apple", "banana", "cherry"], (s) => s.charAt(0));
    expect(result.get("a")).toBe("apple");
    expect(result.get("b")).toBe("banana");
    expect(result.get("c")).toBe("cherry");
  });

  it("zip should combine two arrays into an array of pairs", () => {
    const result = _Array.zip([1, 2, 3], ["a", "b"]);
    expect(result).toEqual([
      [1, "a"],
      [2, "b"],
      [3, undefined],
    ]);
  });

  it("wrapInArray should wrap a single value in an array", () => {
    expect(_Array.wrapInArray(5)).toEqual([5]);
    expect(_Array.wrapInArray([1, 2, 3])).toEqual([1, 2, 3]);
    expect(_Array.wrapInArray(undefined)).toEqual([]);
  });

  it("surround should return the elements immediately before and after the first element matching the predicate", () => {
    const result = _Array.surround([1, 2, 3, 4, 5], (n) => n === 3);
    expect(result).toEqual([2, 4]);
  });

  it("surround should return an empty array if no elements match the predicate", () => {
    const result = _Array.surround([1, 2, 3], (n) => n === 5);
    expect(result).toEqual([]);
  });

  it("isValidIndex should return correct validity of indices", () => {
    expect(_Array.isValidIndex([10, 20, 30], 1)).toBe(true);
    expect(_Array.isValidIndex([10, 20, 30], -1)).toBe(false);
    expect(_Array.isValidIndex([10, 20, 30], 3)).toBe(false);
  });
});
