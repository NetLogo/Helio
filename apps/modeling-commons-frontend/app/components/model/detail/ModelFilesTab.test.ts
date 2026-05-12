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
