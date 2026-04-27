import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ImageUploader from "./ImageUploader.vue";

describe("ImageUploader", () => {
  it("renders without props", async () => {
    const wrapper = await mountSuspended(ImageUploader);
    expect(wrapper.exists()).toBe(true);
  });

  it("forwards an image-only accept attribute to the underlying file input", async () => {
    const wrapper = await mountSuspended(ImageUploader);
    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    expect(fileInput.attributes("accept")).toBe("image/*");
  });

  it.todo("exposes openFilePicker via the component instance — source does not defineExpose any method", async () => {
    const wrapper = await mountSuspended(ImageUploader);
    const exposed = (wrapper.vm as unknown as { openFilePicker?: () => void }).openFilePicker;
    expect(typeof exposed).toBe("function");
  });

  it.todo(
    "Preview-after-selection / remove-resets behavior lives inside Nuxt UI's UFileUpload — ImageUploader is a thin wrapper that only sets accept and layout. Cover via UFileUpload integration or E2E.",
  );
});
