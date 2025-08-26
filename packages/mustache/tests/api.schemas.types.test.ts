import type { BuildResult, PageResult } from '../src/api.schemas';

describe('API Schemas', () => {
  describe('Type Exports', () => {
    it('should provide PageResult type correctly', () => {
      const pageResult: PageResult = {
        baseName: 'test',
        sourcePath: '/path/to/source.md',
        success: true,
      };

      expect(pageResult.baseName).toBe('test');
      expect(pageResult.sourcePath).toBe('/path/to/source.md');
      expect(pageResult.success).toBe(true);
    });

    it('should provide BuildResult type correctly', () => {
      const buildResult: BuildResult = {
        pages: {},
        totalPages: 0,
        successfulPages: 0,
        failedPages: 0,
        success: true,
        errors: [],
      };

      expect(buildResult.success).toBe(true);
      expect(buildResult.totalPages).toBe(0);
      expect(buildResult.errors).toEqual([]);
    });

    it('should handle optional fields in PageResult', () => {
      const pageResult: PageResult = {
        baseName: 'test',
        sourcePath: '/path/to/source.md',
        outputPath: '/path/to/output.html',
        language: 'en',
        title: 'Test Page',
        description: 'A test page',
        success: true,
        error: undefined,
        metadataPath: '/path/to/metadata.json',
      };

      expect(pageResult.outputPath).toBe('/path/to/output.html');
      expect(pageResult.language).toBe('en');
      expect(pageResult.title).toBe('Test Page');
      expect(pageResult.description).toBe('A test page');
      expect(pageResult.metadataPath).toBe('/path/to/metadata.json');
    });

    it('should handle optional stats in BuildResult', () => {
      const buildResult: BuildResult = {
        pages: {
          'test.md': {
            baseName: 'test',
            sourcePath: '/path/to/test.md',
            success: true,
          },
        },
        totalPages: 1,
        successfulPages: 1,
        failedPages: 0,
        success: true,
        errors: [],
        stats: {
          buildTimeMs: 100,
          startTime: new Date('2024-01-01T00:00:00Z'),
          endTime: new Date('2024-01-01T00:00:01Z'),
        },
      };

      expect(buildResult.stats?.buildTimeMs).toBe(100);
      expect(buildResult.stats?.startTime).toBeInstanceOf(Date);
      expect(buildResult.stats?.endTime).toBeInstanceOf(Date);
    });
  });
});
