import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import NetlogoFileUpload from "./NetlogoFileUpload.vue";

describe("NetlogoFileUpload", () => {
  it("renders the drag-and-drop label", async () => {
    const wrapper = await mountSuspended(NetlogoFileUpload);
    expect(wrapper.text()).toContain("Drag and drop a NetLogo model here");
  });

  it("renders the supported-types description with a max size", async () => {
    const wrapper = await mountSuspended(NetlogoFileUpload);
    expect(wrapper.text()).toContain(".nlogox");
    expect(wrapper.text()).toMatch(/max\.\s+10/i);
  });

  it("renders a 'Browse files' fallback button (include-browse-button)", async () => {
    const wrapper = await mountSuspended(NetlogoFileUpload);
    expect(wrapper.text()).toContain("Browse files");
  });

  it("forwards an .nlogox accept attribute to the underlying file input", async () => {
    const wrapper = await mountSuspended(NetlogoFileUpload);
    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    expect(fileInput.attributes("accept")).toContain(".nlogox");
  });

  it.todo(
    "Plan called for `.nlogo`/`.nlogox`/`.nlogo3d`/`.nlogox3d`/`.nls` filtering, but the current source only accepts `.nlogox`. Update the source first if other formats are needed.",
  );

  it.todo(
    "Plan called for a 'replacing primary file shows confirmation' flow, but the source has no confirmation modal — replacement is delegated to the parent. Cover at the page level.",
  );

  it.todo(
    "Plan called for a mocked uploadPrimaryFile call, but NetlogoFileUpload only emits via v-model and does not import useModelDraft. The page wires uploads.",
  );
});
