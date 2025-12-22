import { z } from "zod";
import { PrimitiveCatalogSchema } from "./types";

const PrimitiveIndexMetadataSchema = z
  .object({
    layout: z.enum(["default", "catalog"]).default("default"),
    primitiveCatalog: PrimitiveCatalogSchema.optional(),
  })
  .superRefine((obj, ctx) => {
    return;

    // TODO: re-enable this when the renderer pipeline implements it
    // @ts-expect-error -- IGNORE --
    if (obj.layout === "catalog" && obj.primitiveCatalog === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["primitiveCatalog"],
        message: "primitiveCatalog is required when layout is 'catalog'",
      });
    }
  });

export default PrimitiveIndexMetadataSchema;
