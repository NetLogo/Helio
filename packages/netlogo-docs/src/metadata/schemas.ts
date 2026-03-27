import * as z from "zod";

import { PageMetadataSchemaFields } from "@repo/template/schemas";
import ExtensionMetadataSchema from "../extension-docs/public-schema";
import { GitMetadataSchema } from "../git/public-schema";
import PrimitiveIndexMetadataSchema from "../primitive-index/public-schema";
export const Schemas = {
  page: PageMetadataSchemaFields,
  extension: ExtensionMetadataSchema,
  primIndex: PrimitiveIndexMetadataSchema,
  navigation: z.object({
    icon: z.string().optional().default("i-lucide-file-text"),
  }),
  git: GitMetadataSchema,
};
