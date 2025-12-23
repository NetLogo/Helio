import { describe, expect, it } from "vitest";
import * as _Null from "./null";

describe("Null", () => {
  it("defined should correctly identify defined values", () => {
    expect(_Null.defined(5)).toBe(true);
    expect(_Null.defined(null)).toBe(false);
    expect(_Null.defined(undefined)).toBe(false);
  });

  it("truthy should correctly identify truthy values", () => {
    expect(_Null.truthy(1)).toBe(true);
    expect(_Null.truthy(0)).toBe(false);
    expect(_Null.truthy("hello")).toBe(true);
    expect(_Null.truthy("")).toBe(false);
  });
});
