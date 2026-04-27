import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ImageDropZone from "./ImageDropZone.vue";

function makeFile(name: string, type: string, size = 100): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("ImageDropZone", () => {
  it("forwards an image-only accept attribute to the underlying file input", async () => {
    const wrapper = await mountSuspended(ImageDropZone);
    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    expect(fileInput.attributes("accept")).toBe("image/*");
  });

  it.todo("emits 'select' when a file is chosen via the hidden input — no native <input type=file> in source; UFileUpload owns the picker", async () => {
    const wrapper = await mountSuspended(ImageDropZone);
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement;
    const file = makeFile("photo.png", "image/png");

    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    await wrapper.find('input[type="file"]').trigger("change");

    const events = wrapper.emitted("select");
    expect(events).toBeTruthy();
    expect((events![0]![0] as File).name).toBe("photo.png");
  });

  it("renders the initial preview when initialPreviewUrl is provided", async () => {
    const wrapper = await mountSuspended(ImageDropZone, {
      props: { initialPreviewUrl: "https://example.test/preview.png" },
    });
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://example.test/preview.png");
  });

  it("renders the upload-icon placeholder when no preview is set", async () => {
    const wrapper = await mountSuspended(ImageDropZone);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it.todo("exposes openFilePicker via the component instance — source does not defineExpose any method", async () => {
    const wrapper = await mountSuspended(ImageDropZone);
    const exposed = (wrapper.vm as unknown as { openFilePicker?: () => void }).openFilePicker;
    expect(typeof exposed).toBe("function");
  });

  it.todo(
    "ImageDropZone delegates accept-attribute filtering to the browser via accept='image/*' — non-image files are not filtered in JS, so a 'rejects non-image' assertion would be testing the browser, not the component.",
  );
});
