import * as z from "zod";
import { makeFileSchema } from "~/components/upload/FileUploader.vue";

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
    maxFileSize: sizeToBytes(5, "MB"),
    acceptedFileTypes: imageFileFormats,
  }).nullable(),
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
];

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
type UploadFormInput = Omit<z.input<typeof UploadFormSchema>, "nlogoxFile"> & {
  nlogoxFile: File | null;
};

export {
  AddDetailsCardSchema,
  additionalFilesSchema,
  collaboratorOptions,
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
export type { AddDetailsCard, PeerReviewCard, SetPermissionsCard, UploadForm, UploadFormInput };
