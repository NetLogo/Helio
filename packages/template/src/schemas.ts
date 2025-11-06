import z from "zod";

/**
 * Schema for individual build variables declarations,
 * defined as key-value pairs.
 */
const BuildVariablesDeclarationSchema = z.record(z.string(), z.string());

const AuthorDeclarationSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  url: z.string().optional(),
});

/**
 * Schema for an item in the Page configuration.
 * These typically live under the `defaults` key in the config file
 * or in the first YAML front matter of a Page file.
 *
 * @example
 * ```yaml
 * tags:
 * - Behavior Space
 * ---
 * visible: True
 * title: Behavior Space
 * description: BehaviorSpace is a software tool integrated with NetLogo that allows you to perform experiments with models.
 * keywords:
 *   - Behavior Space
 *   - NetLogo
 * ---
 * visible: True
 * language: es
 * title: Espacio-Conductual
 * description: Espacio-Conductual es una herramienta de software integrada con NetLogo que permite realizar experimentos con modelos.
 * keywords:
 *   - Espacio-Conductual
 *   - NetLogo
 *   - Behavior Space
 */
const PageDeclarationSchemaFields = z.object({
  // The YAML front matter can inherit from other items by their index
  inheritFrom: z.array(z.number()).optional(),
  // The language of the content (e.g., 'en', 'fr')
  language: z.string().optional(),
  // Whether this front matter item exports an HTML file
  output: z.union([z.boolean(), z.string(), z.null(), z.undefined()]).optional(),
  // The variables used to populate the Mustache templates
  // as provided in the front matter
  buildVariables: BuildVariablesDeclarationSchema.optional(),
  // File extension to use for scanning
  extension: z.string().optional().default(".md"),

  // Other common keys
  title: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  authors: z.array(AuthorDeclarationSchema).optional(),
});

const PageDeclarationSchema = PageDeclarationSchemaFields.and(z.record(z.any(), z.any()));

type PageConfig = z.infer<typeof PageDeclarationSchema>;

/**
 * Main configuration schema for the builder.
 * Enforces required keys and their structure.
 */
const ProjectConfigSchema = z.object({
  // Version
  version: z.string().default("1.0.0"),
  // The root of the script files
  projectRoot: z.string().default("."),
  // Where to find the source files
  scanRoot: z.string().default("."),
  // Where to output the built files
  outputRoot: z.string().default("./dist"),
  // Default declarations for items
  defaults: PageDeclarationSchema,
  // Optional engine to use for rendering templates
  engine: z.enum(["mustache", "handlebars"]).default("mustache").optional(),
  // Partials settings
  partials: z
    .object({
      // (relative) Path to partials
      directoryPaths: z.array(z.string()).default(["."]),
      // (non-dot prefixed) allowed extensions for partials
      extensions: z.array(z.string()).default(["mustache", "md"]),
    })
    .default({ directoryPaths: ["."], extensions: ["mustache", "md"] }),
  // Metadata settings
  metadata: z
    .object({
      // Whether to generate metadata files
      enabled: z.boolean().default(false),
      // Kind of metadata to generate
      kind: z.enum(["file", "prepend"]).default("file").optional(),
      // If 'prepend', what string to use to prepend metadata
      prepend: z
        .object({
          separator: z.string().default("---").optional(),
          format: z.enum(["yaml", "json"]).default("yaml").optional(),
          // prettier-ignore
          method: z.function({
            input: [z.object({
              content: z.string(),
              metadata: z.record(z.string(), z.unknown()),
            })],
            output: z.string(),
          }).optional(),
        })
        .optional(),
      // Optional transform function to manipulate metadata
      // prettier-ignore
      transform: z.function({
        input: [z.record(z.string(), z.unknown())],
        output: z.record(z.string(), z.unknown()),
      }).optional(),
    })
    .default({ enabled: false }),
  // Localization settings
  locale: z
    .object({
      /**
       * How to convert a slug to a localized slug.
       * By default, this will prefix the slug with the language code
       * if the language is not the default language.
       *
       * @example
       * toSlug({ language: 'es', defaultLanguage: 'en', slug: 'getting-started' })
       *    => 'es/getting-started'
       */
      toSlug: z.function({
        input: [
          z.object({
            language: z.string(),
            defaultLanguage: z.string(),
            pageConfig: PageDeclarationSchemaFields,
            slug: z.string(),
          }),
        ],
        output: z.string(),
      }),
    })
    .default({
      toSlug: ({ language, defaultLanguage, slug }) =>
        language !== defaultLanguage ? `${language}/${slug}` : slug,
    }),
  // If <file> exists and is identical to what would be written,
  // do not write to disk. This can help avoid unnecessary rebuilds
  // in some systems.
  dedupeIdenticalDiskWrites: z.boolean().default(true).optional(),
});

/**
 * Type-safe representation of a valid builder config.
 */
type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
type ProjectConfigInput = Partial<ProjectConfig> & {
  defaults: Partial<PageConfig>;
};

/**
 * Metadata Schema
 */
const PageMetadataSchemaFields = z.object({
  source: z.string(),
  metadataOutputPath: z.string(),
  projectConfig: ProjectConfigSchema.omit({ locale: true, metadata: true }),
});

const PageMetadataSchema = PageMetadataSchemaFields.and(z.record(z.string(), z.unknown()));

type PageMetadata = z.infer<typeof PageMetadataSchema>;

export {
  AuthorDeclarationSchema,
  BuildVariablesDeclarationSchema,
  PageDeclarationSchema,
  PageMetadataSchema,
  PageMetadataSchemaFields,
  ProjectConfigSchema,
};
export type { PageConfig, PageMetadata, ProjectConfig, ProjectConfigInput };
