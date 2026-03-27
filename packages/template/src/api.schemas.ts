import * as z from "zod";
export const PageResultSchema = z.object({
  /** Base file name */
  baseName: z.string(),
  /** The source file path that was processed */
  sourcePath: z.string(),
  /** The output file path where the rendered content was written */
  outputPath: z.string().optional(),
  /** The language of the generated page */
  language: z.string().optional(),
  /** The title of the page */
  title: z.string().optional(),
  /** Brief description of the page */
  description: z.string().optional(),
  /** Whether the page was successfully rendered and written to disk */
  success: z.boolean(),
  /** Error message if rendering failed */
  error: z.string().optional(),
  /** Relative path of exported Metadata file */
  metadataPath: z.string().optional(),
});

export const BuildResultSchema = z.object({
  /** Map of relative file paths to their build results */
  pages: z.record(z.string(), PageResultSchema),
  /** Total number of pages processed */
  totalPages: z.number(),
  /** Number of pages successfully built */
  successfulPages: z.number(),
  /** Number of pages that failed to build */
  failedPages: z.number(),
  /** Overall build success status */
  success: z.boolean(),
  /** List of any global build errors */
  errors: z.array(z.string()),
  /** Build statistics and timing information */
  stats: z
    .object({
      /** Total build time in milliseconds */
      buildTimeMs: z.number(),
      /** Start time of the build */
      startTime: z.date(),
      /** End time of the build */
      endTime: z.date(),
    })
    .optional(),
});

export type PageResult = z.infer<typeof PageResultSchema>;
export type BuildResult = z.infer<typeof BuildResultSchema>;
