import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import FileUploader from "./FileUploader.vue";
import { makeFileSchema } from "~/utils/file-schema";

function makeFile(name: string, size = 100, type = "text/plain"): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("FileUploader (component)", () => {
  it("renders without props", async () => {
    const wrapper = await mountSuspended(FileUploader);
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the 'Browse files' fallback when includeBrowseButton is true", async () => {
    const wrapper = await mountSuspended(FileUploader, {
      props: { includeBrowseButton: true },
    });
    expect(wrapper.text()).toContain("Browse files");
  });

  it("hides the 'Browse files' fallback by default", async () => {
    const wrapper = await mountSuspended(FileUploader);
    expect(wrapper.text()).not.toContain("Browse files");
  });

  it.todo("exposes openFilePicker via the component instance — source does not currently defineExpose any method", async () => {
    const wrapper = await mountSuspended(FileUploader);
    const exposed = (wrapper.vm as unknown as { openFilePicker?: () => void }).openFilePicker;
    expect(typeof exposed).toBe("function");
  });
});

describe("makeFileSchema", () => {
  it("accepts a file under the size cap", () => {
    const schema = makeFileSchema({ maxFileSize: 1024 });
    expect(schema.safeParse(makeFile("a.txt", 200)).success).toBe(true);
  });

  it("rejects a file over the size cap", () => {
    const schema = makeFileSchema({ maxFileSize: 100 });
    expect(schema.safeParse(makeFile("a.txt", 200)).success).toBe(false);
  });

  it("respects acceptedFileTypes", () => {
    const schema = makeFileSchema({
      maxFileSize: 1_000_000,
      acceptedFileTypes: [".nlogox"],
    });
    expect(schema.safeParse(makeFile("model.nlogox", 100)).success).toBe(true);
    expect(schema.safeParse(makeFile("data.csv", 100)).success).toBe(false);
  });

  it("respects deniedFileTypes", () => {
    const schema = makeFileSchema({
      maxFileSize: 1_000_000,
      deniedFileTypes: [".exe"],
    });
    expect(schema.safeParse(makeFile("safe.txt", 100)).success).toBe(true);
    expect(schema.safeParse(makeFile("evil.exe", 100)).success).toBe(false);
  });

  it("rejects non-File values", () => {
    const schema = makeFileSchema({ maxFileSize: 1024 });
    expect(schema.safeParse("nope").success).toBe(false);
    expect(schema.safeParse(null).success).toBe(false);
  });

  it.todo(
    "FileUploader does not call useModelDraft.uploadAttachment directly — it only emits via v-model. The page wires uploads. Move that contract test to upload.vue or to a useModelDraft unit test.",
  );

  it.todo(
    "Toast surfacing on upload errors is owned by the calling page, not by FileUploader.",
  );
});
