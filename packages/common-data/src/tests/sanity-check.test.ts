import { describe, it } from "vitest";
import * as CommonData from "../index";
import * as Primitives from "../primitives.cjs";

describe("Sanity Check", () => {
  it("Can import types from Index", () => {
    expect(CommonData).toBeDefined();
    expect(CommonData.PrimitiveSchema).toBeDefined();
  });
  it("Can import main from Primitives", () => {
    expect(Primitives).toBeDefined();
    expect(Primitives.main).toBeDefined();
  });
  it("Can call main from Primitives", () => {
    const primitivesParsedCount = Primitives.main();
    expect(primitivesParsedCount).toBeGreaterThan(500);
  });
});
