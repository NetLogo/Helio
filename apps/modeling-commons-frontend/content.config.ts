import { defineCollection, defineContentConfig } from "@nuxt/content";
import * as z from "zod";

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: "page",
      source: "**/*.md",
      schema: z.object({
        title: z.string(),
        description: z.string().default(""),
        last_revised: z.string().default(() => new Date().toISOString()),
        has_hero: z.boolean().default(true),
        hero_class: z.string().default("bg-primary text-white"),
      }),
    }),
  },
});
