import * as z from "zod";
import type { DraftData } from "~/composables/model/useModelDraft";
import { deniedFileTypes, imageFileFormats } from "~/utils/constants";
import { sizeToBytes } from "~/utils/converters";
import { makeFileSchema } from "~/utils/file-schema";

const maxNetlogoFileSize = 10 * 1024 * 1024; // 10 MB
const netlogoFileSchema = makeFileSchema({
  maxFileSize: maxNetlogoFileSize,
  acceptedFileTypes: [".nlogox"],
});

const modelFilesSchema = z.array(
  makeFileSchema({
    maxFileSize: sizeToBytes(10, "MB"),
    deniedFileTypes: deniedFileTypes,
  }),
);

const additionalFilesSchema = z.array(
  makeFileSchema({
    maxFileSize: sizeToBytes(10, "MB"),
    deniedFileTypes: deniedFileTypes,
  }),
);

const modelUsecases = [
  {
    label: "Good for research",
    value: "research",
  },
  {
    label: "Good for teaching",
    value: "teaching",
  },
];

const AddDetailsCardSchema = z.object({
  imageFile: makeFileSchema({
    maxFileSize: sizeToBytes(15, "MB"),
    acceptedFileTypes: imageFileFormats,
  })
    .nullable()
    .optional(),
  title: z.string().min(1, "Model title is required"),
  description: z.string().min(1, "Description is required"),
  tags: z.array(z.string()).default([]),
  usecases: z.array(z.enum(Object.values(modelUsecases).map((option) => option.value))).default([]),
  subjects: z.array(z.string()).default([]),
});

type AddDetailsCard = z.infer<typeof AddDetailsCardSchema>;

const permissionOptions = [
  { value: "private", label: "Private, only I can see this model" },
  { value: "unlisted", label: "Unlisted, anyone with the link can see this model" },
  { value: "public", label: "Public, anyone can see this model" },
] as const;

const collaboratorOptions = [
  {
    value: "yes",
    label: "Yes, please add my model to the list of models looking for collaborators",
  },
];

const SetPermissionsCardSchema = z.object({
  permission: z
    .enum(Object.values(permissionOptions).map((option) => option.value))
    .default("private"),
  groupId: z.string().nullable().default(null),
  collaboratorEmails: z.array(z.email()).default([]),
  askForCollaborators: z.boolean().default(false),
});

type SetPermissionsCard = z.infer<typeof SetPermissionsCardSchema>;

const peerReviewKindOptions = [
  { value: "visualization", label: "I want suggestions to improve the visualization" },
  { value: "code", label: "I want suggestions to improve the code" },
  { value: "all", label: "I want suggestions to improve both the visualization and the code" },
];
const PeerReviewCardSchema = z.object({
  askForPeerReview: z.boolean().default(false),
  peerReviewKinds: z.array(z.enum(["visualization", "code", "all"])).default([]),
  peerReviewDescription: z.string().nullable().default(null),
});

type PeerReviewCard = z.infer<typeof PeerReviewCardSchema>;

const UploadFormSchema = z
  .object({
    nlogoxFile: netlogoFileSchema,
  })
  .extend(AddDetailsCardSchema.shape)
  .extend(SetPermissionsCardSchema.shape)
  .extend(PeerReviewCardSchema.shape);

type UploadForm = z.infer<typeof UploadFormSchema>;
type UploadFormInput = Omit<z.input<typeof UploadFormSchema>, "nlogoxFile">;

type PrimaryFileMeta = NonNullable<DraftData["primaryFile"]> & { fileId?: string };
type StagedAttachmentMeta = NonNullable<DraftData["attachments"]>[number];

const emptyUploadFormState = (): UploadFormInput => ({
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

function collectTagNames(form: UploadFormInput): string[] {
  return [
    ...(form.tags ?? []).map((t) => t.trim()).filter(Boolean),
    ...(form.subjects ?? []).map((s) => s.trim()).filter(Boolean),
    ...(form.usecases ?? []).map((u) => `usecase:${u}`),
  ];
}

const USECASE_TAG_PREFIX = "usecase:";

function partitionDraftTags(
  tags: string[] | undefined,
): Pick<UploadFormInput, "tags" | "subjects" | "usecases"> {
  const usecaseValues = new Set(modelUsecases.map((option) => option.value));
  const usecases: string[] = [];
  const passthrough: string[] = [];
  for (const raw of tags ?? []) {
    if (raw.startsWith(USECASE_TAG_PREFIX)) {
      const value = raw.slice(USECASE_TAG_PREFIX.length);
      if (usecaseValues.has(value)) {
        usecases.push(value);
        continue;
      }
    }
    passthrough.push(raw);
  }
  return { tags: passthrough, subjects: [], usecases };
}

function draftToFormState(draft: DraftData): {
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

export {
  AddDetailsCardSchema,
  additionalFilesSchema,
  collaboratorOptions,
  collectTagNames,
  draftToFormState,
  emptyUploadFormState,
  maxNetlogoFileSize,
  modelFilesSchema,
  modelUsecases,
  netlogoFileSchema,
  PeerReviewCardSchema,
  peerReviewKindOptions,
  permissionOptions,
  SetPermissionsCardSchema,
  UploadFormSchema,
};
export type {
  AddDetailsCard,
  PeerReviewCard,
  PrimaryFileMeta,
  SetPermissionsCard,
  StagedAttachmentMeta,
  UploadForm,
  UploadFormInput,
};
