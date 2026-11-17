import { draftLiterals } from "~/features/drafts/literals";
import type { UploadFormInput } from "~/features/drafts/validators";

export const emptyUploadFormState = (): UploadFormInput => ({
  imageFile: null,
  title: "",
  description: "",
  tags: [],
  usecases: [],
  subjects: [],
  permission: "private",
  groupId: null,
  collaboratorEmails: [],
  askForCollaborators: false,
  askForPeerReview: false,
  peerReviewKinds: [],
});

export function collectTagNames(form: UploadFormInput): string[] {
  return [
    ...(form.tags ?? []).map((t) => t.trim()).filter(Boolean),
    ...(form.subjects ?? []).map((s) => s.trim()).filter(Boolean),
    ...(form.usecases ?? []).map((u) => `usecase:${u}`),
  ];
}

const USECASE_TAG_PREFIX = "usecase:";

type ModelUsecase = (typeof draftLiterals.modelUsecases)[number]["value"];

function isModelUsecase(value: string): value is ModelUsecase {
  return draftLiterals.modelUsecases.some((option) => option.value === value);
}

function partitionDraftTags(
  tags: string[] | undefined,
): Pick<UploadFormInput, "tags" | "subjects" | "usecases"> {
  const usecases: ModelUsecase[] = [];
  const passthrough: string[] = [];
  for (const raw of tags ?? []) {
    if (raw.startsWith(USECASE_TAG_PREFIX)) {
      const value = raw.slice(USECASE_TAG_PREFIX.length);
      if (isModelUsecase(value)) {
        usecases.push(value);
        continue;
      }
    }
    passthrough.push(raw);
  }
  return { tags: passthrough, subjects: [], usecases };
}

export function draftToFormState(draft: DraftData): {
  formState: UploadFormInput;
  primaryFile: PrimaryFileMeta | null;
  attachments: StagedAttachmentMeta[];
} {
  const base = emptyUploadFormState();
  const partitioned = partitionDraftTags(draft.tags);
  return {
    formState: {
      ...base,
      title: draft.title ?? "",
      description: draft.description ?? "",
      permission: draft.visibility ?? base.permission,
      tags: partitioned.tags,
      subjects: partitioned.subjects,
      usecases: partitioned.usecases,
    },
    primaryFile: draft.primaryFile ? { ...draft.primaryFile } : null,
    attachments: [...(draft.attachments ?? [])],
  };
}
