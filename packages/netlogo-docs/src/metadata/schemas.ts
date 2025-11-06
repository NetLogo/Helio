import z from "zod";

import { PageMetadataSchema } from "@repo/template/schemas";
import ExtensionMetadataSchema from "../extension-docs/public-schema";
import PrimitiveIndexMetadataSchema from "../primitive-index/public-schema";
export const Schemas = {
  page: PageMetadataSchema,
  extension: ExtensionMetadataSchema,
  primIndex: PrimitiveIndexMetadataSchema,
  navigation: z.object({
    icon: z.string().optional().default("i-lucide-file-text"),
  }),
};
