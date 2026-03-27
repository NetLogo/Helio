import { defineCollection, defineContentConfig } from '@nuxt/content';
import { PrimitiveSchema } from '@repo/common-data';
import { fileURLToPath } from 'url';
import * as z from 'zod';
import { MetadataSchema as DocumentMetadataSchema } from './lib/docs/schema';

const PrimitiveDataSchema = z.object({
  primitives: z.array(PrimitiveSchema),
});

const AudienceEnum = z.enum(['educators', 'students', 'researchers']);
const LevelEnum = z.enum(['novice', 'intermediate', 'advanced']);

const LearningPathSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  family: AudienceEnum.optional(),
  level: LevelEnum.optional(),
  links: z
    .array(
      z.object({
        to: z.string(),
        label: z.string(),
      }),
    )
    .default([]),
  description: z.string().default(''),
  icon: z.string().default('i-lucide-map'),
  thumbnail: z.string().default('/images/default-thumbnail.png'),
  sections: z
    .object({
      title: z.string(),
      description: z.string().default(''),
      articles: z.array(z.string()).default([]),
      icon: z.string().default('i-lucide-file-text'),
    })
    .array(),
});

const AuthorSchema = z.object({
  name: z.string(),
  url: z.string().url().optional(),
});

const FileTreeSchema = z.object({
  name: z.string(),
  type: z.enum(['file', 'directory']),
  sizeKB: z.number().optional(),
  icon: z.string().optional(),
  children: z.array(z.record(z.string(), z.any())).optional(),
});

const Image = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  /* Typically, caption ?= alt */
  caption: z.string().optional(),
});

const ResourceSchema = z.object({
  title: z.string(),
  fullName: z.string().optional(),
  shortName: z.string().optional(),

  description: z.string().default(''),
  longDescription: z.string().optional(),
  url: z.string().url(),
  secondaryUrl: z
    .object({
      label: z.string(),
      url: z.string().url(),
      props: z.record(z.string(), z.any()),
    })
    .optional(),
  thumbnail: Image.optional(),
  type: z.enum(['book', 'website', 'course', 'sample curriculum', 'dataset', 'software resource', 'paper', 'other']),
  pricing: z.enum(['free', 'paid', 'freemium']).optional(),
  endorsement: z.enum(['official', 'community', 'endorsed', 'none']).optional(),
  level: z.array(LevelEnum).default([]),
  targetAudience: z.array(AudienceEnum).default([]),

  authors: z.array(AuthorSchema).default([]),
  yearPublished: z.number().int().optional(),
  publisher: z.string().optional(),
  citation: z.string().optional(),
  languages: z.array(z.string()).default([]),
  formats: z.array(z.string()).default([]),

  netLogoVersion: z.string().optional(),
  containsModels: z.boolean().optional().default(false),

  tags: z.array(z.string()).default([]),

  // Paper/Book metadata
  doi: z.string().optional(),
  isbn: z.string().optional(),
  isbn13: z.string().optional(),
  printLength: z.number().int().optional(),

  // Course metadata
  courseProvider: z.string().optional(),
  courseLengthHours: z.number().optional(),

  // Dataset metadata
  datasetSizeKB: z.number().optional(),
  datasetFormats: z.array(z.string()).default([]),
  datasetContents: FileTreeSchema.optional(),

  // Software Resource: Model Library / Package / Extension metadata
  softwareResourceKind: z.enum(['model library', 'package', 'extension']).optional(),
  compatibleWith: z.array(z.string()).default([]),
  screenshots: z.array(Image).default([]),

  // Curriculum metadata
  gradeLevels: z.array(z.string()).default([]),
  subjectAreas: z.array(z.string()).default([]),
  curriculumStandards: z.array(z.string()).default([]),
  curriculumMaterialsIncluded: z.array(z.string()).default([]),
  curriculumDurationHours: z.number().optional(),
});

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: DocumentMetadataSchema,
    }),
    primitives: defineCollection({
      type: 'data',
      source: fileURLToPath(import.meta.resolve('@repo/common-data/datasets/primitives.yaml')),
      schema: PrimitiveDataSchema,
    }),
    learningPaths: defineCollection({
      type: 'data',
      source: 'learning-paths/*.yaml',
      schema: LearningPathSchema,
    }),
    resources: defineCollection({
      type: 'data',
      source: 'resources/*.yaml',
      schema: ResourceSchema,
    }),
  },
});
