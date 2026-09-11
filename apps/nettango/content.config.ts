import { defineCollection, defineContentConfig } from "@nuxt/content";
import { DocumentMetadataSchema } from "@repo/netlogo-docs/metadata";

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: "page",
      source: "**/*.md",
      schema: DocumentMetadataSchema,
    }),
  },
});
