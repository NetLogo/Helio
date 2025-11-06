import { z } from "zod";

const ExtensionMetadataSchema = z.object({
  extensionName: z
    .object({
      shortName: z.string(),
      fullName: z.string(),
    })
    .optional(),
});

export default ExtensionMetadataSchema;
