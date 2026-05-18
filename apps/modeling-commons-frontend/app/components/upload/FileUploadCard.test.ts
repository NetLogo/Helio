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

  describe("existing attachments", () => {
    const existing = [
      {
        id: "att-1",
        s3Key: "k1",
        filename: "readme.md",
        sizeBytes: 200,
        mimeType: "text/markdown",
      },
      {
        id: "att-2",
        s3Key: "k2",
        filename: "paper.pdf",
        sizeBytes: 4096,
        mimeType: "application/pdf",
      },
    ];

    it("renders the filenames of provided existing attachments", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: { modelFiles: [], additionalFiles: [], existingAttachments: existing },
      });
      expect(wrapper.text()).toContain("readme.md");
      expect(wrapper.text()).toContain("paper.pdf");
    });

    it("notes the lock copy when lockExisting is true", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: {
          modelFiles: [],
          additionalFiles: [],
          existingAttachments: existing,
          lockExisting: true,
        },
      });
      expect(wrapper.text()).toContain("cannot be removed in edit mode");
    });

    it("omits the lock copy when lockExisting is false", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: {
          modelFiles: [],
          additionalFiles: [],
          existingAttachments: existing,
          lockExisting: false,
        },
      });
      expect(wrapper.text()).not.toContain("cannot be removed in edit mode");
    });

    it("does not render the existing-files block when the prop is empty", async () => {
      const wrapper = await mountSuspended(FileUploadCard, {
        props: { modelFiles: [], additionalFiles: [], existingAttachments: [] },
      });
      expect(wrapper.text()).not.toContain("Existing files");
    });
  });
});
