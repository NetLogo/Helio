import { DocumentMetadataSchema, Schemas } from '@repo/netlogo-docs/metadata';
import { z } from 'zod';

export const LearnMetadataSchema = z.object({
  thumbnail: z.string().optional(),
  tags: z.array(z.string()).default([]),
  badge: z.string().default('Article'),
  hideFromList: z.boolean().default(false),
});

// prettier-ignore
export const MetadataSchema =
    DocumentMetadataSchema.and(Schemas.navigation)
                          .and(LearnMetadataSchema)
                          .and(Schemas.git);

export type DocumentMetadata = z.infer<typeof MetadataSchema>;
