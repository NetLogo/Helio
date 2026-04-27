import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import FileDropZoneBase from "./FileDropZoneBase.vue";

function makeDataTransfer(files: File[]): DataTransfer {
  const dt = {
    files: files as unknown as FileList,
  };
  return dt as unknown as DataTransfer;
}

describe("FileDropZoneBase", () => {
  it("emits `select` when a file is dropped", async () => {
    const wrapper = await mountSuspended(FileDropZoneBase);
    const file = new File(["hi"], "model.nlogo", { type: "text/plain" });
    await wrapper.trigger("drop", { dataTransfer: makeDataTransfer([file]) });
    const events = wrapper.emitted("select");
    expect(events).toBeTruthy();
    expect(events![0]![0]).toBe(file);
  });

  it("does not emit `select` when drop has no files", async () => {
    const wrapper = await mountSuspended(FileDropZoneBase);
    await wrapper.trigger("drop", { dataTransfer: makeDataTransfer([]) });
    expect(wrapper.emitted("select")).toBeFalsy();
  });

  it("toggles dragging state on dragover and dragleave", async () => {
    const wrapper = await mountSuspended(FileDropZoneBase);
    await wrapper.trigger("dragover");
    expect(wrapper.vm.isDragging).toBe(true);
    await wrapper.trigger("dragleave");
    expect(wrapper.vm.isDragging).toBe(false);
  });

  it("emits `select` when a file is chosen via the input", async () => {
    const wrapper = await mountSuspended(FileDropZoneBase);
    const file = new File(["x"], "x.txt", { type: "text/plain" });
    const input = wrapper.find("input[type=file]").element as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [file] as unknown as FileList,
      writable: false,
    });
    await wrapper.find("input[type=file]").trigger("change");
    const events = wrapper.emitted("select");
    expect(events).toBeTruthy();
    expect(events![0]![0]).toBe(file);
  });

  it("forwards the `accept` prop to the underlying input", async () => {
    const wrapper = await mountSuspended(FileDropZoneBase, {
      props: { accept: ".nlogo,.nlogo3d" },
    });
    expect(wrapper.find("input[type=file]").attributes("accept")).toBe(".nlogo,.nlogo3d");
  });
});
