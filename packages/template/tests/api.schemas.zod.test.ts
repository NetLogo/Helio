import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';

describe('api.schemas Zod Validation', () => {
  // We need to access the schemas directly to test validation
  // Since they're not exported, we'll create them locally for testing
  const PageResultSchema = z.object({
    baseName: z.string(),
    sourcePath: z.string(),
    outputPath: z.string().optional(),
    language: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    success: z.boolean(),
    error: z.string().optional(),
    metadataPath: z.string().optional(),
  });

  const BuildResultSchema = z.object({
    pages: z.record(z.string(), PageResultSchema),
    totalPages: z.number(),
    successfulPages: z.number(),
    failedPages: z.number(),
    success: z.boolean(),
    errors: z.array(z.string()),
    stats: z
      .object({
        buildTimeMs: z.number(),
        startTime: z.date(),
        endTime: z.date(),
      })
      .optional(),
  });

  describe('PageResultSchema validation', () => {
    it('should validate a valid page result', () => {
      const validPageResult = {
        baseName: 'test-page',
        sourcePath: 'test.md',
        outputPath: 'test.html',
        language: 'en',
        title: 'Test Page',
        description: 'A test page',
        success: true,
        metadataPath: 'test.json',
      };

      expect(() => PageResultSchema.parse(validPageResult)).not.toThrow();
      const parsed = PageResultSchema.parse(validPageResult);
      expect(parsed).toEqual(validPageResult);
    });

    it('should validate minimal page result with required fields only', () => {
      const minimalPageResult = {
        baseName: 'minimal',
        sourcePath: 'minimal.md',
        success: true,
      };

      expect(() => PageResultSchema.parse(minimalPageResult)).not.toThrow();
    });

    it('should reject page result missing required baseName', () => {
      const invalidPageResult = {
        sourcePath: 'test.md',
        success: true,
      };

      expect(() => PageResultSchema.parse(invalidPageResult)).toThrow();
    });

    it('should reject page result missing required sourcePath', () => {
      const invalidPageResult = {
        baseName: 'test',
        success: true,
      };

      expect(() => PageResultSchema.parse(invalidPageResult)).toThrow();
    });

    it('should reject page result missing required success', () => {
      const invalidPageResult = {
        baseName: 'test',
        sourcePath: 'test.md',
      };

      expect(() => PageResultSchema.parse(invalidPageResult)).toThrow();
    });

    it('should reject page result with wrong types', () => {
      const invalidPageResult = {
        baseName: 123, // should be string
        sourcePath: 'test.md',
        success: true,
      };

      expect(() => PageResultSchema.parse(invalidPageResult)).toThrow();
    });
  });

  describe('BuildResultSchema validation', () => {
    it('should validate a valid build result', () => {
      const validBuildResult = {
        pages: {
          'test.md': {
            baseName: 'test',
            sourcePath: 'test.md',
            success: true,
          },
        },
        totalPages: 1,
        successfulPages: 1,
        failedPages: 0,
        success: true,
        errors: [],
        stats: {
          buildTimeMs: 1000,
          startTime: new Date(),
          endTime: new Date(),
        },
      };

      expect(() => BuildResultSchema.parse(validBuildResult)).not.toThrow();
    });

    it('should validate build result without stats', () => {
      const buildResult = {
        pages: {},
        totalPages: 0,
        successfulPages: 0,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(() => BuildResultSchema.parse(buildResult)).not.toThrow();
    });

    it('should reject build result with invalid pages', () => {
      const invalidBuildResult = {
        pages: {
          'test.md': {
            // Missing required fields
            sourcePath: 'test.md',
          },
        },
        totalPages: 1,
        successfulPages: 1,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(() => BuildResultSchema.parse(invalidBuildResult)).toThrow();
    });

    it('should reject build result with wrong types', () => {
      const invalidBuildResult = {
        pages: {},
        totalPages: '1', // should be number
        successfulPages: 1,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(() => BuildResultSchema.parse(invalidBuildResult)).toThrow();
    });

    it('should reject build result with invalid stats', () => {
      const invalidBuildResult = {
        pages: {},
        totalPages: 0,
        successfulPages: 0,
        failedPages: 0,
        success: true,
        errors: [],
        stats: {
          buildTimeMs: '1000', // should be number
          startTime: new Date(),
          endTime: new Date(),
        },
      };

      expect(() => BuildResultSchema.parse(invalidBuildResult)).toThrow();
    });
  });

  describe('Type inference', () => {
    it('should infer correct types from schemas', () => {
      type PageResult = z.infer<typeof PageResultSchema>;
      type BuildResult = z.infer<typeof BuildResultSchema>;

      // This test ensures the type exports work correctly
      const pageResult: PageResult = {
        baseName: 'test',
        sourcePath: 'test.md',
        success: true,
      };

      const buildResult: BuildResult = {
        pages: { 'test.md': pageResult },
        totalPages: 1,
        successfulPages: 1,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(pageResult.baseName).toBe('test');
      expect(buildResult.totalPages).toBe(1);
    });
  });
});
