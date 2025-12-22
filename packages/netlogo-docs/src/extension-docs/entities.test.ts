import { describe, expect, it } from "vitest";
import { NetLogoType } from "./entities";
import type { TypeName } from "./types";

describe("NetLogoType", () => {
  it("should handle explicit names", () => {
    const type: TypeName = { kind: "NetLogoString" };
    const netLogoType = new NetLogoType(type, "my-string");
    expect(netLogoType.kind).toBe("DescribedType");
    expect(netLogoType.explicitName).toBe("my-string");
    expect(netLogoType.name).toBe("my-string");
  });

  it("should handle unnamed types", () => {
    const type: TypeName = { kind: "NetLogoString" };
    const netLogoType = new NetLogoType(type, undefined);
    expect(netLogoType.kind).toBe("UnnamedType");
    expect(netLogoType.explicitName).toBeUndefined();
    // The implementation lowercases the type name before kebab-casing, so "NetLogoString" becomes "netlogostring"
    expect(netLogoType.name).toBe("netlogo-string");
  });

  it("should format custom types correctly", () => {
    const type: TypeName = { kind: "CustomType", name: "MyCustomType" };
    const netLogoType = new NetLogoType(type, undefined);
    // "MyCustomType" -> "MyCustom" (strips Type) -> "mycustom" (lowercase)
    expect(netLogoType.name).toBe("my-custom");
  });

  it("should format wildcard types correctly", () => {
    const type: TypeName = { kind: "WildcardType" };
    const netLogoType = new NetLogoType(type, undefined);
    expect(netLogoType.name).toBe("anything");
  });

  it("should remove 'Type' suffix from kind names", () => {
    const type: TypeName = { kind: "CommandType" };
    const netLogoType = new NetLogoType(type, undefined);
    expect(netLogoType.name).toBe("command");
  });
});
