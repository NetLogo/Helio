import { describe, expect, it } from "vitest";
import { getFileURI, getPreviewImageURI, withApiBase } from "~/utils/formatters";

describe("withApiBase", () => {
  it("prepends the configured apiBase", () => {
    const apiBase = useRuntimeConfig().public.apiBase;
    expect(withApiBase("api/v1/foo")).toBe(`${apiBase}/api/v1/foo`);
  });
});

describe("getFileURI", () => {
  it("returns the file download URI", () => {
    expect(getFileURI("file-id")).toBe("api/v1/files/file-id/download");
  });
});

describe("getPreviewImageURI", () => {
  it("returns the preview-image URI for the given model and version", () => {
    expect(getPreviewImageURI("m1", 3)).toBe("api/v1/models/m1/versions/3/preview-image");
  });
});
