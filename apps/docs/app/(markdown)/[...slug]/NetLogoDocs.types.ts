import { ProjectConfigSchema } from '@repo/mustache/schemas';
import z from 'zod';

const MinimalDocumentMetadataSchema = z.object({
  title: z.string().default('Documentation'),
  description: z.string().default('Documentation page'),
  layout: z.enum(['default', 'catalog']).default('default'),
  projectConfig: ProjectConfigSchema.optional(),
});

const DocumentMetadataSchema = MinimalDocumentMetadataSchema.and(z.record(z.string(), z.unknown()));

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export { DocumentMetadataSchema, MinimalDocumentMetadataSchema };
