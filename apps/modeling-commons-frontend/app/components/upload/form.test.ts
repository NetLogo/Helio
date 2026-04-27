import { describe, expect, it } from "vitest";
import {
  AddDetailsCardSchema,
  PeerReviewCardSchema,
  SetPermissionsCardSchema,
  UploadFormSchema,
  additionalFilesSchema,
  collaboratorOptions,
  maxNetlogoFileSize,
  modelFilesSchema,
  modelUsecases,
  netlogoFileSchema,
  peerReviewKindOptions,
  permissionOptions,
} from "./form";

function makeFile(name: string, size = 100, type = "text/plain"): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("upload/form constants", () => {
  it("exposes a 10 MB cap for the primary NetLogo file", () => {
    expect(maxNetlogoFileSize).toBe(10 * 1024 * 1024);
  });

  it("exposes the canonical permission options (private/unlisted/public)", () => {
    const values = permissionOptions.map((option) => option.value);
    expect(values).toEqual(expect.arrayContaining(["private", "unlisted", "public"]));
  });

  it("exposes the supported peer-review kinds", () => {
    const values = peerReviewKindOptions.map((option) => option.value);
    expect(values).toEqual(["visualization", "code", "all"]);
  });

  it("exposes the model-usecase choices", () => {
    const values = modelUsecases.map((option) => option.value);
    expect(values).toEqual(expect.arrayContaining(["research", "teaching"]));
  });

  it("exposes the collaborator opt-in option", () => {
    expect(collaboratorOptions.map((option) => option.value)).toContain("yes");
  });
});

describe("netlogoFileSchema", () => {
  it("accepts a .nlogox file under the size cap", () => {
    const file = makeFile("model.nlogox", 1024);
    const result = netlogoFileSchema.safeParse(file);
    expect(result.success).toBe(true);
  });

  it("rejects an unsupported file extension", () => {
    const file = makeFile("model.txt", 1024);
    const result = netlogoFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("rejects a .nlogo file (only .nlogox accepted)", () => {
    const file = makeFile("model.nlogo", 1024);
    const result = netlogoFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("rejects a file larger than the cap", () => {
    const file = makeFile("model.nlogox", maxNetlogoFileSize + 1);
    const result = netlogoFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("rejects values that are not File instances", () => {
    const result = netlogoFileSchema.safeParse("not-a-file");
    expect(result.success).toBe(false);
  });
});

describe("modelFilesSchema and additionalFilesSchema", () => {
  it("accept arrays of allowed files", () => {
    const file = makeFile("data.csv", 200);
    expect(modelFilesSchema.safeParse([file]).success).toBe(true);
    expect(additionalFilesSchema.safeParse([file]).success).toBe(true);
  });

  it("accept empty arrays", () => {
    expect(modelFilesSchema.safeParse([]).success).toBe(true);
    expect(additionalFilesSchema.safeParse([]).success).toBe(true);
  });

  it("accept a mixed array of allowed extensions", () => {
    const files = [
      makeFile("a.csv", 100),
      makeFile("b.png", 100, "image/png"),
      makeFile("c.txt", 100),
    ];
    expect(modelFilesSchema.safeParse(files).success).toBe(true);
    expect(additionalFilesSchema.safeParse(files).success).toBe(true);
  });

  it.each([".exe", ".bat", ".cmd", ".sh", ".dll"])("reject denied %s files", (ext) => {
    const file = makeFile(`malicious${ext}`, 100);
    expect(modelFilesSchema.safeParse([file]).success).toBe(false);
    expect(additionalFilesSchema.safeParse([file]).success).toBe(false);
  });

  it("reject oversized files", () => {
    const file = makeFile("big.csv", 10 * 1024 * 1024 + 1);
    expect(modelFilesSchema.safeParse([file]).success).toBe(false);
    expect(additionalFilesSchema.safeParse([file]).success).toBe(false);
  });
});

describe("AddDetailsCardSchema", () => {
  it("requires a non-empty title with 'Model title is required'", () => {
    const result = AddDetailsCardSchema.safeParse({
      imageFile: null,
      title: "",
      description: "Some description",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Model title is required", path: ["title"] }),
      );
    }
  });

  it("requires a non-empty description with 'Description is required'", () => {
    const result = AddDetailsCardSchema.safeParse({
      imageFile: null,
      title: "Some title",
      description: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Description is required", path: ["description"] }),
      );
    }
  });

  it("defaults tags / usecases / subjects to empty arrays", () => {
    const result = AddDetailsCardSchema.safeParse({
      imageFile: null,
      title: "Title",
      description: "Description",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.usecases).toEqual([]);
      expect(result.data.subjects).toEqual([]);
    }
  });

  it("accepts arbitrary string arrays for tags and subjects", () => {
    const result = AddDetailsCardSchema.safeParse({
      imageFile: null,
      title: "Title",
      description: "Description",
      tags: ["agent", "simulation"],
      subjects: ["biology", "ecology"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["agent", "simulation"]);
      expect(result.data.subjects).toEqual(["biology", "ecology"]);
    }
  });

  it.each(["research", "teaching"] as const)("accepts usecase '%s'", (value) => {
    const result = AddDetailsCardSchema.safeParse({
      imageFile: null,
      title: "Title",
      description: "Description",
      usecases: [value],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown usecase value", () => {
    const result = AddDetailsCardSchema.safeParse({
      imageFile: null,
      title: "Title",
      description: "Description",
      usecases: ["bogus"],
    });
    expect(result.success).toBe(false);
  });

  describe("imageFile", () => {
    it("accepts null", () => {
      const result = AddDetailsCardSchema.safeParse({
        imageFile: null,
        title: "Title",
        description: "Description",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid image file", () => {
      const result = AddDetailsCardSchema.safeParse({
        imageFile: makeFile("preview.png", 1024, "image/png"),
        title: "Title",
        description: "Description",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an oversized image (>5 MB)", () => {
      const result = AddDetailsCardSchema.safeParse({
        imageFile: makeFile("preview.png", 5 * 1024 * 1024 + 1, "image/png"),
        title: "Title",
        description: "Description",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a non-image extension", () => {
      const result = AddDetailsCardSchema.safeParse({
        imageFile: makeFile("notes.txt", 1024, "text/plain"),
        title: "Title",
        description: "Description",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("SetPermissionsCardSchema", () => {
  it("defaults permission to private", () => {
    const result = SetPermissionsCardSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permission).toBe("private");
      expect(result.data.askForCollaborators).toBe(false);
      expect(result.data.collaboratorEmails).toEqual([]);
      expect(result.data.groupId).toBeNull();
    }
  });

  it("rejects permission values outside the allowed enum", () => {
    const result = SetPermissionsCardSchema.safeParse({ permission: "everyone" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid collaborator emails", () => {
    const result = SetPermissionsCardSchema.safeParse({
      collaboratorEmails: ["not-an-email"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an array of valid collaborator emails", () => {
    const result = SetPermissionsCardSchema.safeParse({
      collaboratorEmails: ["a@example.com", "b@example.org"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.collaboratorEmails).toEqual(["a@example.com", "b@example.org"]);
    }
  });

  it.each(["private", "unlisted", "public"] as const)("accepts permission '%s'", (value) => {
    const result = SetPermissionsCardSchema.safeParse({ permission: value });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permission).toBe(value);
    }
  });

  it("accepts askForCollaborators toggle (true/false)", () => {
    const truthy = SetPermissionsCardSchema.safeParse({ askForCollaborators: true });
    expect(truthy.success).toBe(true);
    if (truthy.success) {
      expect(truthy.data.askForCollaborators).toBe(true);
    }
    const falsy = SetPermissionsCardSchema.safeParse({ askForCollaborators: false });
    expect(falsy.success).toBe(true);
    if (falsy.success) {
      expect(falsy.data.askForCollaborators).toBe(false);
    }
  });
});

describe("PeerReviewCardSchema", () => {
  it("defaults all fields", () => {
    const result = PeerReviewCardSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.askForPeerReview).toBe(false);
      expect(result.data.peerReviewKinds).toEqual([]);
      expect(result.data.peerReviewDescription).toBeNull();
    }
  });

  it("accepts a known peer-review kind", () => {
    const result = PeerReviewCardSchema.safeParse({
      peerReviewKinds: ["code"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown peer-review kind", () => {
    const result = PeerReviewCardSchema.safeParse({
      peerReviewKinds: ["bogus"],
    });
    expect(result.success).toBe(false);
  });

  it.each(["visualization", "code", "all"] as const)(
    "accepts peer-review kind '%s'",
    (kind) => {
      const result = PeerReviewCardSchema.safeParse({ peerReviewKinds: [kind] });
      expect(result.success).toBe(true);
    },
  );

  it("accepts a non-null peerReviewDescription string", () => {
    const result = PeerReviewCardSchema.safeParse({
      peerReviewDescription: "Please look at the colors.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.peerReviewDescription).toBe("Please look at the colors.");
    }
  });

  it("accepts an explicit null peerReviewDescription", () => {
    const result = PeerReviewCardSchema.safeParse({ peerReviewDescription: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.peerReviewDescription).toBeNull();
    }
  });

  it("accepts askForPeerReview toggle (true)", () => {
    const result = PeerReviewCardSchema.safeParse({ askForPeerReview: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.askForPeerReview).toBe(true);
    }
  });
});

describe("UploadFormSchema", () => {
  it("accepts a fully valid payload", () => {
    const result = UploadFormSchema.safeParse({
      nlogoxFile: makeFile("model.nlogox", 1024),
      imageFile: null,
      title: "Title",
      description: "Description",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing the primary NetLogo file", () => {
    const result = UploadFormSchema.safeParse({
      imageFile: null,
      title: "Title",
      description: "Description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload whose primary file is .nlogo (not .nlogox)", () => {
    const result = UploadFormSchema.safeParse({
      nlogoxFile: makeFile("model.nlogo", 1024),
      imageFile: null,
      title: "Title",
      description: "Description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload whose primary file is oversized", () => {
    const result = UploadFormSchema.safeParse({
      nlogoxFile: makeFile("model.nlogox", maxNetlogoFileSize + 1),
      imageFile: null,
      title: "Title",
      description: "Description",
    });
    expect(result.success).toBe(false);
  });

  it("inherits AddDetails validation (empty title rejects)", () => {
    const result = UploadFormSchema.safeParse({
      nlogoxFile: makeFile("model.nlogox", 1024),
      imageFile: null,
      title: "",
      description: "Description",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ message: "Model title is required", path: ["title"] }),
      );
    }
  });

  it("accepts a fully populated payload with all child schemas satisfied", () => {
    const result = UploadFormSchema.safeParse({
      nlogoxFile: makeFile("model.nlogox", 1024),
      imageFile: makeFile("preview.png", 1024, "image/png"),
      title: "Title",
      description: "Description",
      tags: ["a", "b"],
      usecases: ["research"],
      subjects: ["biology"],
      permission: "public",
      groupId: null,
      collaboratorEmails: ["c@example.com"],
      askForCollaborators: true,
      askForPeerReview: true,
      peerReviewKinds: ["all"],
      peerReviewDescription: "Look at everything",
    });
    expect(result.success).toBe(true);
  });
});
