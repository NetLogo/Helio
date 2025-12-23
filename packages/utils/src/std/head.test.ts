import { describe, expect, it } from "vitest";
import * as _Heap from "./heap";

describe("Javascript Heap", () => {
  it("can call logMemoryUsage without error", () => {
    expect(() => {
      _Heap.logMemoryUsage();
    }).not.toThrow();
  });
});
