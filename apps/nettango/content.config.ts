import { defineCollection, defineContentConfig } from "@nuxt/content";
import { DocumentMetadataSchema } from "@repo/netlogo-docs/metadata";
import { HomeSchema } from "./shared/schemas/home";

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: "page",
      source: "**/*.md",
      schema: DocumentMetadataSchema,
    }),
    home: defineCollection({
      type: "data",
      source: "home.yml",
      schema: HomeSchema,
    }),
  },
});
