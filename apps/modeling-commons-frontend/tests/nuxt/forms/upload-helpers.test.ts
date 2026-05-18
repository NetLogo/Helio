import { describe, expect, it } from "vitest";
import {
  collectTagNames,
  draftToFormState,
  emptyUploadFormState,
} from "~/forms/upload";

describe("emptyUploadFormState", () => {
  it("returns a form with private visibility and empty arrays", () => {
    const state = emptyUploadFormState();
    expect(state.title).toBe("");
    expect(state.description).toBe("");
    expect(state.permission).toBe("private");
    expect(state.tags).toEqual([]);
    expect(state.subjects).toEqual([]);
    expect(state.usecases).toEqual([]);
    expect(state.imageFile).toBeNull();
    expect(state.groupId).toBeNull();
  });

  it("returns a fresh object on every call (no shared references)", () => {
    const a = emptyUploadFormState();
    const b = emptyUploadFormState();
    a.tags.push("mutation");
    expect(b.tags).toEqual([]);
  });
});

describe("collectTagNames", () => {
  it("concatenates tags + subjects + usecases with the usecase: prefix", () => {
    const out = collectTagNames({
      ...emptyUploadFormState(),
      tags: ["agents", "abm"],
      subjects: ["biology"],
      usecases: ["research", "teaching"],
    });
    expect(out).toEqual(["agents", "abm", "biology", "usecase:research", "usecase:teaching"]);
  });

  it("trims whitespace and drops empty entries from tags and subjects", () => {
    const out = collectTagNames({
      ...emptyUploadFormState(),
      tags: ["  ", "agents", ""],
      subjects: [" biology "],
      usecases: [],
    });
    expect(out).toEqual(["agents", "biology"]);
  });

  it("does not prefix-strip values already in tags (only usecases get the prefix)", () => {
    const out = collectTagNames({
      ...emptyUploadFormState(),
      tags: ["usecase:research"],
      subjects: [],
      usecases: [],
    });
    expect(out).toEqual(["usecase:research"]);
  });
});

describe("draftToFormState", () => {
  it("maps title, description, and visibility into the form state", () => {
    const { formState } = draftToFormState({
      title: "Wolf Sheep",
      description: "predator-prey dynamics",
      visibility: "public",
    });
    expect(formState.title).toBe("Wolf Sheep");
    expect(formState.description).toBe("predator-prey dynamics");
    expect(formState.permission).toBe("public");
  });

  it("falls back to empty defaults when fields are absent", () => {
    const { formState } = draftToFormState({});
    expect(formState.title).toBe("");
    expect(formState.description).toBe("");
    expect(formState.permission).toBe("private");
  });

  it("partitions usecase: tags back into the usecases field and leaves other tags in tags", () => {
    const { formState } = draftToFormState({
      tags: ["agents", "usecase:research", "abm", "usecase:teaching"],
    });
    expect(formState.tags).toEqual(["agents", "abm"]);
    expect(formState.usecases).toEqual(["research", "teaching"]);
    expect(formState.subjects).toEqual([]);
  });

  it("ignores usecase: prefixes whose value is not a known usecase", () => {
    const { formState } = draftToFormState({ tags: ["usecase:bogus"] });
    expect(formState.usecases).toEqual([]);
    expect(formState.tags).toEqual(["usecase:bogus"]);
  });

  it("returns primaryFile metadata when present", () => {
    const { primaryFile } = draftToFormState({
      primaryFile: {
        s3Key: "staging/u/d/abc-model.nlogox",
        filename: "model.nlogox",
        sizeBytes: 1024,
        mimeType: "application/octet-stream",
      },
    });
    expect(primaryFile).not.toBeNull();
    expect(primaryFile?.filename).toBe("model.nlogox");
    expect(primaryFile?.s3Key).toBe("staging/u/d/abc-model.nlogox");
  });

  it("returns null primaryFile and empty attachments when absent", () => {
    const { primaryFile, attachments } = draftToFormState({});
    expect(primaryFile).toBeNull();
    expect(attachments).toEqual([]);
  });

  it("preserves attachment metadata", () => {
    const { attachments } = draftToFormState({
      attachments: [
        {
          id: "att-1",
          s3Key: "staging/u/d/xyz-readme.md",
          filename: "readme.md",
          sizeBytes: 200,
          mimeType: "text/markdown",
        },
      ],
    });
    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.filename).toBe("readme.md");
  });

  it("round-trips usecase tags through collectTagNames", () => {
    const { formState } = draftToFormState({
      tags: ["agents", "usecase:research"],
    });
    expect(collectTagNames(formState).sort()).toEqual(
      ["agents", "usecase:research"].sort(),
    );
  });
});
