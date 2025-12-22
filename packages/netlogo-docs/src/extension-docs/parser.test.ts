import { describe, expect, it } from "vitest";
import { parseAllFromText } from "./parser";

describe("Extension Docs Parser", () => {
  it("should parse a valid extension config", () => {
    const yaml = `
extensionName: MyExtension
icon: icon.png
primitives:
  - name: my-primitive
    type: command
    description: Does something.
    arguments:
      - name: arg1
        type: number
`;
    const result = parseAllFromText(yaml);

    expect(result.warnings.warnings).toHaveLength(0);
    expect(result.documentation?.extensionName).toBe("MyExtension");
    expect(result.primitives).toHaveLength(1);
    expect(result.primitives?.[0]?.name).toBe("my-primitive");
    expect(result.primitives?.[0]?.syntax.args).toHaveLength(1);
  });

  it("should handle missing primitives gracefully", () => {
    const yaml = `
extensionName: EmptyExtension
`;
    const result = parseAllFromText(yaml);
    expect(result.primitives).toHaveLength(0);
    expect(result.documentation?.extensionName).toBe("EmptyExtension");
  });
});
