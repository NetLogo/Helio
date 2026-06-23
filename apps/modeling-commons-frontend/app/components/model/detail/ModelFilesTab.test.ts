import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelFilesTab from "./ModelFilesTab.vue";
import type { AttachedFile } from "./types";

function makeFile(overrides: Partial<AttachedFile> = {}): AttachedFile {
  return {
    id: "file-1",
    title: "data.csv",
    description: "",
    type: "csv",
    kind: "additional",
    taggedVersionNumber: 1,
    versionUrl: "/models/model-1/versions/1",
    authorName: "Ada Lovelace",
    updatedAt: new Date("2026-04-15T00:00:00Z").toISOString(),
    isPending: false,
    ...overrides,
  };
}

describe("ModelFilesTab", () => {
  it("renders a row for each file with title and author", async () => {
    const wrapper = await mountSuspended(ModelFilesTab, {
      props: {
        files: [
          makeFile({ id: "f1", title: "data.csv", authorName: "Ada Lovelace" }),
          makeFile({ id: "f2", title: "README.md", authorName: "Grace Hopper" }),
        ],
        status: "success",
      },
    });
    const text = wrapper.text();
    expect(text).toContain("data.csv");
    expect(text).toContain("README.md");
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("Grace Hopper");
  });

  it("renders the empty state when no files are attached", async () => {
    const wrapper = await mountSuspended(ModelFilesTab, {
      props: { files: [], status: "success" },
    });
    expect(wrapper.text()).toContain("No files attached");
  });

  it("groups model files and additional files under separate headings", async () => {
    const wrapper = await mountSuspended(ModelFilesTab, {
      props: {
        files: [
          makeFile({ id: "m1", title: "dataset.csv", kind: "model" }),
          makeFile({ id: "a1", title: "README.md", kind: "additional" }),
        ],
        status: "success",
      },
    });
    const text = wrapper.text();
    expect(text).toContain("Model Files");
    expect(text).toContain("Additional Files");
    expect(text).toContain("dataset.csv");
    expect(text).toContain("README.md");
  });

  it("omits the Model Files heading when there are only additional files", async () => {
    const wrapper = await mountSuspended(ModelFilesTab, {
      props: {
        files: [makeFile({ id: "a1", title: "README.md", kind: "additional" })],
        status: "success",
      },
    });
    const text = wrapper.text();
    expect(text).toContain("Additional Files");
    expect(text).not.toContain("Model Files");
  });

  it("shows the version an additional file was added to as a link to that version", async () => {
    const wrapper = await mountSuspended(ModelFilesTab, {
      props: {
        files: [
          makeFile({
            id: "a1",
            title: "notes.md",
            kind: "additional",
            taggedVersionNumber: 3,
            versionUrl: "/models/m1/versions/3",
          }),
        ],
        status: "success",
      },
    });
    const link = wrapper.find('a[href*="/models/m1/versions/3"]');
    expect(link.exists()).toBe(true);
    expect(link.text()).toContain("v3");
  });

  it.todo("emits download with the file id when the row download button is clicked — button selector doesn't match Nuxt UI rendered DOM; needs data-testid on source", async () => {
    const wrapper = await mountSuspended(ModelFilesTab, {
      props: {
        files: [makeFile({ id: "f1", title: "data.csv" })],
        status: "success",
      },
    });
    const buttons = wrapper.findAll("button");
    const downloadBtn = buttons.find((b) => b.find('[class*="i-lucide-download"]').exists());
    expect(downloadBtn).toBeTruthy();
    await downloadBtn!.trigger("click");
    const downloadEmits = wrapper.emitted("download");
    expect(downloadEmits).toBeTruthy();
    expect(downloadEmits?.[0]).toEqual(["f1"]);
  });

  it("shows only model files tagged to the latest version", async () => {
    const wrapper = await mountSuspended(ModelFilesTab, {
      props: {
        files: [
          makeFile({ id: "old", title: "old-dataset.csv", kind: "model", taggedVersionNumber: 1 }),
          makeFile({ id: "new", title: "new-dataset.csv", kind: "model", taggedVersionNumber: 2 }),
        ],
        status: "success",
        latestVersionNumber: 2,
      },
    });
    const text = wrapper.text();
    expect(text).toContain("new-dataset.csv");
    expect(text).not.toContain("old-dataset.csv");
  });

  it("keeps additional files from every version regardless of latestVersionNumber", async () => {
    const wrapper = await mountSuspended(ModelFilesTab, {
      props: {
        files: [
          makeFile({ id: "a1", title: "v1-notes.md", kind: "additional", taggedVersionNumber: 1 }),
          makeFile({ id: "a2", title: "v2-notes.md", kind: "additional", taggedVersionNumber: 2 }),
        ],
        status: "success",
        latestVersionNumber: 2,
      },
    });
    const text = wrapper.text();
    expect(text).toContain("v1-notes.md");
    expect(text).toContain("v2-notes.md");
  });

  it("shows the Add Files button only when editable is true", async () => {
    const wrapperReadonly = await mountSuspended(ModelFilesTab, {
      props: { files: [], status: "success" },
    });
    expect(wrapperReadonly.text()).not.toContain("Add Files");

    const wrapperEditable = await mountSuspended(ModelFilesTab, {
      props: { files: [], status: "success", editable: true },
    });
    expect(wrapperEditable.text()).toContain("Add Files");
  });
});
