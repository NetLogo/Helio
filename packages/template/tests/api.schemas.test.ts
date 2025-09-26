import { describe, expect, it } from '@jest/globals';
import type { BuildResult, PageResult } from '../src/api.schemas.js';

describe('api.schemas', () => {
  describe('PageResult type', () => {
    it('should support minimal page result with required fields', () => {
      const pageResult: PageResult = {
        baseName: 'test',
        sourcePath: 'test.md',
        success: true,
      };

      expect(pageResult.baseName).toBe('test');
      expect(pageResult.sourcePath).toBe('test.md');
      expect(pageResult.success).toBe(true);
      expect(pageResult.outputPath).toBeUndefined();
      expect(pageResult.language).toBeUndefined();
      expect(pageResult.title).toBeUndefined();
      expect(pageResult.description).toBeUndefined();
      expect(pageResult.error).toBeUndefined();
      expect(pageResult.metadataPath).toBeUndefined();
    });

    it('should support full page result with all fields', () => {
      const pageResult: PageResult = {
        baseName: 'test',
        sourcePath: 'test.md',
        outputPath: 'output/test.html',
        language: 'en',
        title: 'Test Page',
        description: 'A test page description',
        success: true,
        metadataPath: 'output/test.metadata.json',
      };

      expect(pageResult.baseName).toBe('test');
      expect(pageResult.sourcePath).toBe('test.md');
      expect(pageResult.outputPath).toBe('output/test.html');
      expect(pageResult.language).toBe('en');
      expect(pageResult.title).toBe('Test Page');
      expect(pageResult.description).toBe('A test page description');
      expect(pageResult.success).toBe(true);
      expect(pageResult.metadataPath).toBe('output/test.metadata.json');
      expect(pageResult.error).toBeUndefined();
    });

    it('should support failed page result with error', () => {
      const pageResult: PageResult = {
        baseName: 'failed',
        sourcePath: 'failed.md',
        success: false,
        error: 'Template rendering failed',
      };

      expect(pageResult.baseName).toBe('failed');
      expect(pageResult.sourcePath).toBe('failed.md');
      expect(pageResult.success).toBe(false);
      expect(pageResult.error).toBe('Template rendering failed');
      expect(pageResult.outputPath).toBeUndefined();
    });

    it('should support partial failure with output but error', () => {
      const pageResult: PageResult = {
        baseName: 'partial',
        sourcePath: 'partial.md',
        outputPath: 'output/partial.html',
        success: false,
        error: 'Metadata generation failed',
      };

      expect(pageResult.baseName).toBe('partial');
      expect(pageResult.sourcePath).toBe('partial.md');
      expect(pageResult.outputPath).toBe('output/partial.html');
      expect(pageResult.success).toBe(false);
      expect(pageResult.error).toBe('Metadata generation failed');
    });

    it('should support different languages', () => {
      const englishResult: PageResult = {
        baseName: 'test.en',
        sourcePath: 'test.en.md',
        language: 'en',
        success: true,
      };

      const spanishResult: PageResult = {
        baseName: 'test.es',
        sourcePath: 'test.es.md',
        language: 'es',
        success: true,
      };

      const frenchResult: PageResult = {
        baseName: 'test.fr',
        sourcePath: 'test.fr.md',
        language: 'fr',
        success: true,
      };

      expect(englishResult.baseName).toBe('test.en');
      expect(englishResult.language).toBe('en');
      expect(spanishResult.baseName).toBe('test.es');
      expect(spanishResult.language).toBe('es');
      expect(frenchResult.baseName).toBe('test.fr');
      expect(frenchResult.language).toBe('fr');
    });
  });

  describe('BuildResult type', () => {
    it('should support minimal build result', () => {
      const buildResult: BuildResult = {
        pages: {},
        totalPages: 0,
        successfulPages: 0,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(buildResult.pages).toEqual({});
      expect(buildResult.totalPages).toBe(0);
      expect(buildResult.successfulPages).toBe(0);
      expect(buildResult.failedPages).toBe(0);
      expect(buildResult.success).toBe(true);
      expect(buildResult.errors).toEqual([]);
      expect(buildResult.stats).toBeUndefined();
    });

    it('should support successful build result with pages', () => {
      const startTime = new Date('2023-01-01T00:00:00Z');
      const endTime = new Date('2023-01-01T00:00:05Z');

      const buildResult: BuildResult = {
        pages: {
          'test1.md': {
            baseName: 'test1',
            sourcePath: 'test1.md',
            outputPath: 'output/test1.html',
            success: true,
            title: 'Test 1',
          },
          'test2.md': {
            baseName: 'test2',
            sourcePath: 'test2.md',
            outputPath: 'output/test2.html',
            success: true,
            title: 'Test 2',
          },
        },
        totalPages: 2,
        successfulPages: 2,
        failedPages: 0,
        success: true,
        errors: [],
        stats: {
          buildTimeMs: 5000,
          startTime,
          endTime,
        },
      };

      expect('test1.md' in buildResult.pages).toBe(true);
      expect('test2.md' in buildResult.pages).toBe(true);
      expect(buildResult.totalPages).toBe(2);
      expect(buildResult.successfulPages).toBe(2);
      expect(buildResult.failedPages).toBe(0);
      expect(buildResult.success).toBe(true);
      expect(buildResult.errors).toEqual([]);
      expect(buildResult.stats?.buildTimeMs).toBe(5000);
      expect(buildResult.stats?.startTime).toEqual(startTime);
      expect(buildResult.stats?.endTime).toEqual(endTime);
    });

    it('should support failed build result with errors', () => {
      const buildResult: BuildResult = {
        pages: {
          'success.md': {
            baseName: 'success',
            sourcePath: 'success.md',
            success: true,
          },
          'failed.md': {
            baseName: 'failed',
            sourcePath: 'failed.md',
            success: false,
            error: 'File not found',
          },
        },
        totalPages: 2,
        successfulPages: 1,
        failedPages: 1,
        success: false,
        errors: [
          'Failed to build failed.md: File not found',
          'Build completed with errors',
        ],
        stats: {
          buildTimeMs: 1500,
          startTime: new Date('2023-01-01T00:00:00Z'),
          endTime: new Date('2023-01-01T00:00:01.5Z'),
        },
      };

      expect(buildResult.totalPages).toBe(2);
      expect(buildResult.successfulPages).toBe(1);
      expect(buildResult.failedPages).toBe(1);
      expect(buildResult.success).toBe(false);
      expect(buildResult.errors).toHaveLength(2);
      expect(buildResult.errors[0]).toBe(
        'Failed to build failed.md: File not found'
      );
      expect(buildResult.pages['success.md'].success).toBe(true);
      expect(buildResult.pages['failed.md'].success).toBe(false);
      expect(buildResult.pages['failed.md'].error).toBe('File not found');
    });

    it('should support complete failure', () => {
      const buildResult: BuildResult = {
        pages: {},
        totalPages: 0,
        successfulPages: 0,
        failedPages: 0,
        success: false,
        errors: ['Critical system error'],
        stats: {
          buildTimeMs: 100,
          startTime: new Date('2023-01-01T00:00:00Z'),
          endTime: new Date('2023-01-01T00:00:00.1Z'),
        },
      };

      expect(buildResult.success).toBe(false);
      expect(buildResult.errors).toEqual(['Critical system error']);
      expect(buildResult.totalPages).toBe(0);
      expect(buildResult.stats?.buildTimeMs).toBe(100);
    });

    it('should support multi-language builds', () => {
      const buildResult: BuildResult = {
        pages: {
          'doc.en.md': {
            baseName: 'doc.en',
            sourcePath: 'doc.en.md',
            outputPath: 'dist/doc.html',
            language: 'en',
            success: true,
          },
          'doc.es.md': {
            baseName: 'doc.es',
            sourcePath: 'doc.es.md',
            outputPath: 'dist/es/doc.html',
            language: 'es',
            success: true,
          },
          'doc.fr.md': {
            baseName: 'doc.fr',
            sourcePath: 'doc.fr.md',
            outputPath: 'dist/fr/doc.html',
            language: 'fr',
            success: true,
          },
        },
        totalPages: 3,
        successfulPages: 3,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(buildResult.totalPages).toBe(3);
      expect(buildResult.pages['doc.en.md'].language).toBe('en');
      expect(buildResult.pages['doc.es.md'].language).toBe('es');
      expect(buildResult.pages['doc.fr.md'].language).toBe('fr');
      expect(buildResult.pages['doc.en.md'].outputPath).toBe('dist/doc.html');
      expect(buildResult.pages['doc.es.md'].outputPath).toBe(
        'dist/es/doc.html'
      );
    });

    it('should support builds with metadata paths', () => {
      const buildResult: BuildResult = {
        pages: {
          'test.md': {
            baseName: 'test',
            sourcePath: 'test.md',
            outputPath: 'dist/test.html',
            metadataPath: 'dist/test.metadata.json',
            success: true,
            title: 'Test Document',
            description: 'A test document',
          },
        },
        totalPages: 1,
        successfulPages: 1,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(buildResult.pages['test.md'].metadataPath).toBe(
        'dist/test.metadata.json'
      );
      expect(buildResult.pages['test.md'].title).toBe('Test Document');
      expect(buildResult.pages['test.md'].description).toBe('A test document');
    });

    it('should support large builds with many pages', () => {
      const pages: Record<string, PageResult> = {};
      for (let i = 1; i <= 100; i++) {
        pages[`page${i}.md`] = {
          baseName: `page${i}`,
          sourcePath: `page${i}.md`,
          outputPath: `dist/page${i}.html`,
          success: true,
          title: `Page ${i}`,
        };
      }

      const buildResult: BuildResult = {
        pages,
        totalPages: 100,
        successfulPages: 100,
        failedPages: 0,
        success: true,
        errors: [],
        stats: {
          buildTimeMs: 30000, // 30 seconds for 100 pages
          startTime: new Date('2023-01-01T00:00:00Z'),
          endTime: new Date('2023-01-01T00:00:30Z'),
        },
      };

      expect(buildResult.totalPages).toBe(100);
      expect(buildResult.successfulPages).toBe(100);
      expect(Object.keys(buildResult.pages)).toHaveLength(100);
      expect(buildResult.pages['page1.md'].title).toBe('Page 1');
      expect(buildResult.pages['page100.md'].title).toBe('Page 100');
    });
  });

  describe('Type compatibility', () => {
    it('should handle PageResult with optional fields as undefined', () => {
      const pageResult: PageResult = {
        baseName: 'test',
        sourcePath: 'test.md',
        success: true,
        outputPath: undefined,
        language: undefined,
        title: undefined,
        description: undefined,
        error: undefined,
        metadataPath: undefined,
      };

      expect(pageResult.baseName).toBe('test');
      expect(pageResult.outputPath).toBeUndefined();
      expect(pageResult.language).toBeUndefined();
      expect(pageResult.title).toBeUndefined();
      expect(pageResult.description).toBeUndefined();
      expect(pageResult.error).toBeUndefined();
      expect(pageResult.metadataPath).toBeUndefined();
    });

    it('should handle BuildResult with optional stats as undefined', () => {
      const buildResult: BuildResult = {
        pages: {},
        totalPages: 0,
        successfulPages: 0,
        failedPages: 0,
        success: true,
        errors: [],
        stats: undefined,
      };

      expect(buildResult.stats).toBeUndefined();
    });

    it('should support empty pages object', () => {
      const buildResult: BuildResult = {
        pages: {},
        totalPages: 0,
        successfulPages: 0,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(Object.keys(buildResult.pages)).toHaveLength(0);
    });

    it('should support empty errors array', () => {
      const buildResult: BuildResult = {
        pages: {},
        totalPages: 0,
        successfulPages: 0,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(buildResult.errors).toEqual([]);
      expect(buildResult.errors).toHaveLength(0);
    });
  });
});
