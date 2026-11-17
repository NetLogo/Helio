import type { input as Input } from "zod";
import { draftLiterals } from "~/features/drafts/literals";
import { draftRules } from "~/features/drafts/rules";
import { deniedFileTypes, imageFileFormats } from "~/utils/constants";
import { makeFileSchema } from "~/utils/file-schema";

const z = await import("zod");

export const netlogoFileSchema = makeFileSchema({
  maxFileSize: draftRules.netlogoFile.maxSize,
  acceptedFileTypes: [...draftRules.netlogoFile.acceptedFileTypes],
});

export const modelFilesSchema = z.array(
  makeFileSchema({
    maxFileSize: draftRules.modelFile.maxSize,
    deniedFileTypes: deniedFileTypes,
  }),
);

export const additionalFilesSchema = z.array(
  makeFileSchema({
    maxFileSize: draftRules.additionalFile.maxSize,
    deniedFileTypes: deniedFileTypes,
  }),
);

export const AddDetailsCardSchema = z.object({
  imageFile: makeFileSchema({
    maxFileSize: draftRules.previewImage.maxSize,
    acceptedFileTypes: imageFileFormats,
  })
    .nullable()
    .optional(),
  title: z.string().min(1, "Model title is required"),
  description: z.string().min(1, "Description is required"),
  tags: z.array(z.string()).default([]),
  usecases: z.array(z.enum(draftLiterals.modelUsecases.map((option) => option.value))).default([]),
  subjects: z.array(z.string()).default([]),
});

export const SetPermissionsCardSchema = z.object({
  permission: z
    .enum(draftLiterals.permissionOptions.map((option) => option.value))
    .default("private"),
  groupId: z.string().nullable().default(null),
  collaboratorEmails: z.array(z.email()).default([]),
  askForCollaborators: z.boolean().default(false),
});

export const PeerReviewCardSchema = z.object({
  askForPeerReview: z.boolean().default(false),
  peerReviewKinds: z.array(z.enum(["visualization", "code", "all"])).default([]),
  peerReviewDescription: z.string().nullable().default(null),
});

export const UploadFormSchema = z
  .object({
    nlogoxFile: netlogoFileSchema,
  })
  .extend(AddDetailsCardSchema.shape)
  .extend(SetPermissionsCardSchema.shape)
  .extend(PeerReviewCardSchema.shape);

export type UploadFormInput = Omit<Input<typeof UploadFormSchema>, "nlogoxFile">;
