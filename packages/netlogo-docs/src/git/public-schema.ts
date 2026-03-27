import * as z from "zod";
const GitMetadataSchema = z.object({
  lastModifiedDate: z.string().optional(),
  lastModifiedAuthor: z.string().optional(),
  createdDate: z.string(),
  authors: z.array(z.string()).default([]),
});

export { GitMetadataSchema };
export type GitMetadata = z.infer<typeof GitMetadataSchema>;
