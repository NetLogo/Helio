import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import FileUploadCard from "./FileUploadCard.vue";

describe("FileUploadCard", () => {
  it("renders the section heading", async () => {
    const wrapper = await mountSuspended(FileUploadCard, {
      props: { modelFiles: [], additionalFiles: [] },
    });
    expect(wrapper.text()).toContain("Upload Files");
  });

  it("renders both 'Model Files' and 'Additional Files' subsections", async () => {
    const wrapper = await mountSuspended(FileUploadCard, {
      props: { modelFiles: [], additionalFiles: [] },
    });
    expect(wrapper.text()).toContain("Model Files");
    expect(wrapper.text()).toContain("Additional Files");
  });

  it("composes two file uploaders", async () => {
    const wrapper = await mountSuspended(FileUploadCard, {
      props: { modelFiles: [], additionalFiles: [] },
    });
    const uploaders = wrapper.findAllComponents({ name: "FileUploader" });
    expect(uploaders.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the description copy for both uploaders", async () => {
    const wrapper = await mountSuspended(FileUploadCard, {
      props: { modelFiles: [], additionalFiles: [] },
    });
    expect(wrapper.text()).toContain("Upload files required to run the model");
    expect(wrapper.text()).toContain("Upload any additional files");
  });

  it("create mode (no existing files) shows just the add-zones", async () => {
    const wrapper = await mountSuspended(FileUploadCard, {
      props: { modelFiles: [], additionalFiles: [] },
    });
    expect(wrapper.text()).not.toContain("Existing files");
    expect(wrapper.text()).not.toContain("cannot be removed");
  });

  it.todo(
    "Staged file list rendering and remove-button emit live inside Nuxt UI's UFileUpload internals, not FileUploadCard. Cover via E2E or a dedicated UFileUpload integration test.",
  );

  describe("existing model files (editable)", () => {
    const existingModelFiles = [
      { id: "m-1", filename: "dataset.csv", sizeBytes: 200 },
      { id: "m-2", filename: "extension.nls", sizeBytes: 4096 },
    ];

    it("renders the filenames of provided existing model files", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: { modelFiles: [], additionalFiles: [], existingModelFiles },
      });
      expect(wrapper.text()).toContain("dataset.csv");
      expect(wrapper.text()).toContain("extension.nls");
    });

    it("renders a remove control for each existing model file", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: { modelFiles: [], additionalFiles: [], existingModelFiles },
      });
      const removeButtons = wrapper.findAll('button[aria-label^="Remove"]');
      expect(removeButtons.length).toBe(2);
    });

    it("emits removeModelFile with the file id when its remove control is clicked", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: { modelFiles: [], additionalFiles: [], existingModelFiles },
      });
      const button = wrapper.find('button[aria-label="Remove dataset.csv"]');
      await button.trigger("click");
      const emitted = wrapper.emitted("removeModelFile");
      expect(emitted).toBeTruthy();
      expect(emitted?.[0]).toEqual(["m-1"]);
    });

    it("does not render the existing-model-files block when the prop is empty", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: { modelFiles: [], additionalFiles: [], existingModelFiles: [] },
      });
      expect(wrapper.text()).not.toContain("Existing files");
    });
  });

  describe("locked additional files", () => {
    const lockedAdditionalFiles = [
      { id: "a-1", filename: "readme.md", sizeBytes: 200 },
      { id: "a-2", filename: "paper.pdf", sizeBytes: 4096 },
    ];

    it("renders the filenames of locked additional files with the lock copy", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: { modelFiles: [], additionalFiles: [], lockedAdditionalFiles },
      });
      expect(wrapper.text()).toContain("readme.md");
      expect(wrapper.text()).toContain("paper.pdf");
      expect(wrapper.text()).toContain("cannot be removed");
    });

    it("does not render a remove control for locked additional files", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: { modelFiles: [], additionalFiles: [], lockedAdditionalFiles },
      });
      const removeButtons = wrapper.findAll('button[aria-label^="Remove"]');
      expect(removeButtons.length).toBe(0);
    });

    it("does not render the locked block when the prop is empty", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: { modelFiles: [], additionalFiles: [], lockedAdditionalFiles: [] },
      });
      expect(wrapper.text()).not.toContain("cannot be removed");
    });
  });
});
