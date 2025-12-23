import { describe, expect, it, vi } from "vitest";
import WarnableValue from "./warnable";

describe("WarnableValue", () => {
  it("should store value and warnings", () => {
    const warnable = new WarnableValue(10, [{ message: "warning 1" }]);
    expect(warnable.obtainedValue).toBe(10);
    expect(warnable.warnings).toEqual([{ message: "warning 1" }]);
  });

  it("map should transform value and preserve warnings", () => {
    const warnable = new WarnableValue(10, [{ message: "warning 1" }]);
    const mapped = warnable.map((x) => x * 2);
    expect(mapped.obtainedValue).toBe(20);
    expect(mapped.warnings).toEqual([{ message: "warning 1" }]);
  });

  it("flatMap should transform value and merge warnings", () => {
    const warnable = new WarnableValue(10, [{ message: "warning 1" }]);
    const flatMapped = warnable.flatMap(
      (x) => new WarnableValue(x * 2, [{ message: "warning 2" }]),
    );
    expect(flatMapped.obtainedValue).toBe(20);
    expect(flatMapped.warnings).toEqual([{ message: "warning 1" }, { message: "warning 2" }]);
  });

  it("ap should apply function in WarnableValue", () => {
    const warnableFn = new WarnableValue((x: number) => x * 2, [{ message: "fn warning" }]);
    const warnableVal = new WarnableValue(10, [{ message: "val warning" }]);
    const result = warnableVal.ap(warnableFn);
    expect(result.obtainedValue).toBe(20);
    expect(result.warnings).toEqual([{ message: "val warning" }, { message: "fn warning" }]);
  });

  it("toString should return string representation", () => {
    const warnable = new WarnableValue(10, [{ message: "w1" }, { message: "w2" }]);
    expect(warnable.toString()).toBe("Value: 10, Warnings: w1; w2");
  });

  it("throw should throw error with warnings", () => {
    const warnable = new WarnableValue(10, [{ message: "w1" }]);
    expect(() => warnable.throw()).toThrow("Cannot extract value due to warnings: w1");
  });

  it("warn should log warnings to console", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const warnable = new WarnableValue(10, [{ message: "w1" }]);
    warnable.warn();
    expect(consoleSpy).toHaveBeenCalledWith("Warning: w1");
    consoleSpy.mockRestore();
  });
});
