import z from 'zod';

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
const PageDeclarationSchema = z.object({
  // The YAML front matter can inherit from other items by their index
  inheritFrom: z.array(z.number()).optional(),
  // The language of the content (e.g., 'en', 'fr')
  language: z.string().optional(),
  // Whether this front matter item exports an HTML file
  output: z.boolean().optional(),
  // The variables used to populate the Mustache templates
  // as provided in the front matter
  buildVariables: BuildVariablesDeclarationSchema.optional(),
  // File extension to use for scanning
  extension: z.string().optional().default('.md'),

  // Other common keys
  title: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  authors: z.array(AuthorDeclarationSchema).optional(),
});

// Allow arbitrary additional keys in the front matter
// as long as they don't conflict with the known keys above
PageDeclarationSchema.and(
  z.record(z.any(), z.any()).refine(
    (obj) => {
      const knownKeys = new Set([
        'inheritFrom',
        'language',
        'output',
        'buildVariables',
        'extension',
        'title',
        'description',
        'shortDescription',
        'keywords',
        'tags',
        'authors',
      ]);
      return Object.keys(obj).every((key) => !knownKeys.has(key));
    },
    {
      message: 'Additional keys must not conflict with known keys',
    }
  )
);

type PageConfig = z.infer<typeof PageDeclarationSchema>;

/**
 * Main configuration schema for the builder.
 * Enforces required keys and their structure.
 */
const ProjectConfigSchema = z.object({
  // The root of the script files
  projectRoot: z.string().default('.'),
  // Where to find the source files
  scanRoot: z.string().default('.'),
  // Where to output the built files
  outputRoot: z.string().default('./dist'),
  // Default declarations for items
  defaults: PageDeclarationSchema,
  // Optional engine to use for rendering templates
  engine: z.enum(['mustache', 'handlebars']).default('mustache').optional(),
});

/**
 * Type-safe representation of a valid builder config.
 */
type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export {
  AuthorDeclarationSchema,
  BuildVariablesDeclarationSchema,
  PageDeclarationSchema,
  ProjectConfigSchema,
};
export type { PageConfig, ProjectConfig };
