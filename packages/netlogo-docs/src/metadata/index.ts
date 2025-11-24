import z from "zod";

import { PageMetadataSchemaFields } from "@repo/template/schemas";

import { Schemas } from "./schemas";

const MinimalDocumentMetadataSchema = PageMetadataSchemaFields.and(
  z.object({
    title: z.string().default("Documentation"),
    description: z.string().default("Documentation page"),
  }),
);

const DocumentMetadataSchema = MinimalDocumentMetadataSchema.and(z.record(z.string(), z.unknown()));

export { DocumentMetadataSchema, MinimalDocumentMetadataSchema, Schemas };
