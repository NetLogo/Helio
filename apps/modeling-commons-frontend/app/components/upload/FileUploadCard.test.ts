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

  it.todo(
    "Staged file list rendering and remove-button emit live inside Nuxt UI's UFileUpload internals, not FileUploadCard. Cover via E2E or a dedicated UFileUpload integration test.",
  );
});
