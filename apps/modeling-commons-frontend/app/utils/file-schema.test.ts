import { describe, expect, it } from "vitest";
import { makeFileSchema } from "./file-schema";

function makeFile(name: string, type: string, size = 10): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe("makeFileSchema", () => {
  it("accepts a file within size and accepted-type list", () => {
    const schema = makeFileSchema({
      maxFileSize: 1024,
      acceptedFileTypes: [".png", ".jpg"],
    });
    const file = makeFile("photo.png", "image/png", 500);
    expect(schema.safeParse(file).success).toBe(true);
  });

  it("rejects a file larger than maxFileSize", () => {
    const schema = makeFileSchema({ maxFileSize: 100 });
    const file = makeFile("big.png", "image/png", 500);
    const result = schema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("rejects a file with an extension not in acceptedFileTypes", () => {
    const schema = makeFileSchema({
      maxFileSize: 10_000,
      acceptedFileTypes: [".png"],
    });
    const file = makeFile("doc.pdf", "application/pdf", 100);
    expect(schema.safeParse(file).success).toBe(false);
  });

  it("rejects a file with an extension in deniedFileTypes", () => {
    const schema = makeFileSchema({
      maxFileSize: 10_000,
      deniedFileTypes: [".exe"],
    });
    const file = makeFile("nasty.EXE", "application/octet-stream", 100);
    expect(schema.safeParse(file).success).toBe(false);
  });

  it("matches extensions case-insensitively against acceptedFileTypes", () => {
    const schema = makeFileSchema({
      maxFileSize: 10_000,
      acceptedFileTypes: [".png"],
    });
    const file = makeFile("photo.PNG", "image/png", 100);
    expect(schema.safeParse(file).success).toBe(true);
  });

  it("rejects non-File values", () => {
    const schema = makeFileSchema({ maxFileSize: 1024 });
    expect(schema.safeParse("not a file").success).toBe(false);
    expect(schema.safeParse(null).success).toBe(false);
  });

  it("accepts any extension when neither accepted nor denied lists are provided", () => {
    const schema = makeFileSchema({ maxFileSize: 1024 });
    const file = makeFile("anything.xyz", "application/octet-stream", 100);
    expect(schema.safeParse(file).success).toBe(true);
  });
});
