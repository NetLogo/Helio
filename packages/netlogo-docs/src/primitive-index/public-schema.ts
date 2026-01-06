import { z } from "zod";
import { PrimitiveCatalogSchema } from "./types";

const PrimitiveIndexMetadataSchema = z.object({
  layout: z.enum(["default", "catalog"]).default("default"),
  primitiveCatalog: PrimitiveCatalogSchema.optional(),
});

export default PrimitiveIndexMetadataSchema;
