import { defineCollection, defineContentConfig } from "@nuxt/content";
import { PrimitiveSchema } from "@repo/common-data";
import { fileURLToPath } from "url";
import * as z from "zod";

const PrimitiveDataSchema = z.object({
  primitives: z.array(PrimitiveSchema),
});

const primitivesCollection = defineCollection({
  type: "data",
  source: fileURLToPath(import.meta.resolve("@repo/common-data/datasets/primitives.yaml")),
  schema: PrimitiveDataSchema,
});

export default defineContentConfig({
  collections: {
    primitives: primitivesCollection,
  },
});
