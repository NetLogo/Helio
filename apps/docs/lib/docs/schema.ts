import { DocumentMetadataSchema, Schemas } from "@repo/netlogo-docs/metadata";
import type z from "zod";

// prettier-ignore
export const MetadataSchema =
    DocumentMetadataSchema.and(Schemas.extension)
                          .and(Schemas.primIndex)
                          .and(Schemas.navigation);
export type DocumentMetadata = z.infer<typeof MetadataSchema>;
