import * as z from "zod";

const LinkSchema = z.object({ label: z.string(), to: z.string() });
const LabelSchema = z.object({ label: z.string() });
const VideoSchema = z.object({ src: z.string(), poster: z.string() });

export const HomeSchema = z.object({
  title: z.string(),
  cta: LinkSchema,
  hero: z.object({
    titleLines: z.array(z.array(z.string())),
    blockWord: z.string(),
    description: z.string(),
    netlogo: LinkSchema,
    secondary: LabelSchema,
    video: VideoSchema,
    builder: LabelSchema.extend({ text: z.string() }),
  }),
  howItWorks: z.object({
    title: z.string(),
    description: z.string(),
    example: z.string(),
    link: LinkSchema,
  }),
  showcase: z.object({
    action: z.string(),
    cards: z.array(z.object({ id: z.string(), label: z.string(), text: z.string(), video: VideoSchema })),
  }),
  topics: z.object({ title: z.string(), link: z.string() }),
  closing: z.object({
    statement: z.string(),
    platforms: z.object({
      text: z.string(),
      icons: z.array(z.object({ label: z.string(), icon: z.string() })),
    }),
  }),
  faq: z.object({
    title: z.string(),
    items: z.array(z.object({ label: z.string(), answer: z.string(), action: LinkSchema.optional() })),
  }),
  designers: z.object({
    title: z.string(),
    description: z.string(),
    tutorial: LabelSchema,
    builder: LinkSchema,
    shorter: LinkSchema.extend({ lead: z.string(), trail: z.string() }),
    file: z.string(),
    caption: z.string(),
    blocksLabel: z.string(),
  }),
});
