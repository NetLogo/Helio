import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs/promises';

import type { PageResult } from '../src/api.schemas.js';
import MustacheRenderer from '../src/Renderer.js';
import type { PageConfig, ProjectConfig } from '../src/schemas.js';

// Mock dependencies for controlled testing
jest.mock('fs/promises');
jest.mock('../src/PageParser.js');
jest.mock('../src/BuildVariablesLoader.js');
jest.mock('../src/ProjectConfigLoader.js');

const mockFs = fs as jest.Mocked<typeof fs>;

// Mock PageParser interface
interface MockPageParser {
  processYamlFile: jest.MockedFunction<
    (yamlPath: string) => Promise<PageResult[]>
  >;
  processConfigurations: jest.MockedFunction<
    (
      config: Array<Partial<PageConfig>>,
      baseFileName: string,
      content?: string
    ) => Promise<PageResult[]>
  >;
}

describe('MustacheRenderer Integration Tests', () => {
  let renderer: MustacheRenderer;
  let config: ProjectConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Configuration matching example.js
    config = {
      projectRoot: '.',
      scanRoot: './test-data',
      outputRoot: './test-dist',
      defaults: {
        language: 'en',
        extension: 'md',
        output: true,
        title: 'Test Page',
        inheritFrom: [0],
      },
    };

    // Setup file system mocks
    mockFs.readdir.mockImplementation(async (dir: any) => {
      if (typeof dir === 'string' && dir.includes('test-data')) {
        return [
          { name: 'test.yaml', isFile: () => true, isDirectory: () => false },
        ] as any;
      }
      return [];
    });

    renderer = new MustacheRenderer(config);
  });

  describe('Basic Configuration and Setup', () => {
    it('should create renderer with example.js configuration', () => {
      expect(renderer).toBeInstanceOf(MustacheRenderer);
      expect(renderer.paths.projectRoot).toContain('mustache');
      expect(renderer.paths.scanRoot).toContain('test-data');
      expect(renderer.paths.outputRoot).toContain('test-dist');
      expect(renderer.defaultLanguage).toBe('en');
    });

    it('should handle build errors gracefully as shown in example.js', async () => {
      // Mock a build failure scenario
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      const result = await renderer.build();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Directory not found');
    });
  });

  describe('Single File Building (buildSingle)', () => {
    it('should build single YAML file as in example.js', async () => {
      // Mock PageParser behavior
      const mockPageParser: MockPageParser = {
        processYamlFile: jest
          .fn<(yamlPath: string) => Promise<PageResult[]>>()
          .mockResolvedValue([
            {
              baseName: 'test',
              sourcePath: 'test.md',
              outputPath: '/test-dist/test.md',
              success: true,
              title: 'Test Page',
              language: 'en',
            },
          ]),
        processConfigurations: jest.fn(),
      };
      (renderer as any)._pageParser = mockPageParser;

      const results = await renderer.buildSingle('test.yaml');

      expect(results).toHaveLength(1);
      expect(results[0].sourcePath).toBe('test.md');
      expect(results[0].success).toBe(true);
      expect(results[0].title).toBe('Test Page');
    });

    it('should handle buildSingle errors gracefully', async () => {
      const mockPageParser: MockPageParser = {
        processYamlFile: jest
          .fn<(yamlPath: string) => Promise<PageResult[]>>()
          .mockRejectedValue(new Error('File not found')),
        processConfigurations: jest.fn(),
      };
      (renderer as any)._pageParser = mockPageParser;

      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const results = await renderer.buildSingle('nonexistent.yaml');

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration-based Building (buildFromConfiguration)', () => {
    it('should build multi-language pages from direct configuration', async () => {
      const configurations = [
        {
          output: true,
          title: 'Direct Config Page',
          content: 'This page was built from direct configuration.',
        },
        {
          output: true,
          language: 'fr',
          title: 'Page de configuration directe',
          content:
            "Cette page a été construite à partir d'une configuration directe.",
        },
        {
          output: true,
          language: 'es',
          title: 'Página de configuración directa',
          content:
            'Esta página se construyó a partir de una configuración directa.',
        },
      ];

      const template = `
# {{title}}
## {{content}}
`;

      // Mock PageParser behavior for multi-language support
      const mockPageParser: MockPageParser = {
        processYamlFile: jest.fn(),
        processConfigurations: jest
          .fn<
            (
              config: Array<Partial<PageConfig>>,
              baseFileName: string,
              content?: string
            ) => Promise<PageResult[]>
          >()
          .mockResolvedValue([
            {
              baseName: 'direct-config',
              sourcePath: 'direct-config.md',
              outputPath: '/test-dist/direct-config.md',
              success: true,
              title: 'Direct Config Page',
              language: 'en',
            },
            {
              baseName: 'direct-config.fr',
              sourcePath: 'direct-config.fr.md',
              outputPath: '/test-dist/fr/direct-config.md',
              success: true,
              title: 'Page de configuration directe',
              language: 'fr',
            },
            {
              baseName: 'direct-config.es',
              sourcePath: 'direct-config.es.md',
              outputPath: '/test-dist/es/direct-config.md',
              success: true,
              title: 'Página de configuración directa',
              language: 'es',
            },
          ]),
      };
      (renderer as any)._pageParser = mockPageParser;

      const results = await renderer.buildFromConfiguration(
        configurations,
        'direct-config',
        template
      );

      expect(results).toHaveLength(3);
      expect(results[0].language).toBe('en');
      expect(results[1].language).toBe('fr');
      expect(results[2].language).toBe('es');
      expect(mockPageParser.processConfigurations).toHaveBeenCalledWith(
        configurations,
        'direct-config',
        template
      );
    });

    it('should handle buildFromConfiguration errors gracefully', async () => {
      const mockPageParser: MockPageParser = {
        processYamlFile: jest.fn(),
        processConfigurations: jest
          .fn<
            (
              config: Array<Partial<PageConfig>>,
              baseFileName: string,
              content?: string
            ) => Promise<PageResult[]>
          >()
          .mockRejectedValue(new Error('Config error')),
      };
      (renderer as any)._pageParser = mockPageParser;

      const configurations = [
        {
          output: true,
          title: 'Error Config',
        },
      ];

      const results = await renderer.buildFromConfiguration(
        configurations,
        'error-config'
      );

      expect(results).toEqual([]);
    });
  });

  describe('Counter Pages Loop (like example.js)', () => {
    it('should build multiple counter pages in sequence', async () => {
      const mockPageParser: MockPageParser = {
        processYamlFile: jest.fn(),
        processConfigurations:
          jest.fn<
            (
              config: Array<Partial<PageConfig>>,
              baseFileName: string,
              content?: string
            ) => Promise<PageResult[]>
          >(),
      };
      (renderer as any)._pageParser = mockPageParser;

      // Mock different responses for each counter page
      for (let i = 1; i <= 5; i++) {
        mockPageParser.processConfigurations.mockResolvedValueOnce([
          {
            baseName: `counter-${i}`,
            sourcePath: `counter/counter-${i}.md`,
            outputPath: `/test-dist/counter/counter-${i}.md`,
            success: true,
            title: `Counter Page ${i}`,
            language: 'en',
          },
          {
            baseName: `counter-${i}.fr`,
            sourcePath: `counter/counter-${i}.fr.md`,
            outputPath: `/test-dist/fr/counter/counter-${i}.md`,
            success: true,
            title: `Page de compteur ${i}`,
            language: 'fr',
          },
          {
            baseName: `counter-${i}.es`,
            sourcePath: `counter/counter-${i}.es.md`,
            outputPath: `/test-dist/es/counter/counter-${i}.md`,
            success: true,
            title: `Página de contador ${i}`,
            language: 'es',
          },
        ]);
      }

      const template = `# {{title}}
This is counter page number **{{count}}**.
`;

      // Build all counter pages
      const allResults: PageResult[][] = [];
      for (let i = 1; i <= 5; i++) {
        const configurations = [
          { count: i },
          { output: true, title: `Counter Page ${i}` },
          { output: true, language: 'fr', title: `Page de compteur ${i}` },
          { output: true, language: 'es', title: `Página de contador ${i}` },
        ];

        const results = await renderer.buildFromConfiguration(
          configurations,
          `counter/counter-${i}`,
          template
        );

        allResults.push(results);
        expect(results).toHaveLength(3);
        expect(results[0].title).toBe(`Counter Page ${i}`);
      }

      expect(allResults).toHaveLength(5);
      expect(mockPageParser.processConfigurations).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling with Invalid Configuration', () => {
    it('should handle invalid inheritFrom indices gracefully', async () => {
      const invalidConfigurations = [
        {
          output: true,
          title: 'Direct Config Page 1',
          content: 'This page was built from direct configuration.',
          inheritFrom: [-1], // Invalid index
        },
        {
          output: true,
          title: 'Direct Config Page 23',
          content: 'This page was built from direct configuration.',
          language: 'es',
        },
      ];

      // Mock PageParser to simulate handling invalid inheritFrom
      const mockPageParser: MockPageParser = {
        processYamlFile: jest.fn(),
        processConfigurations: jest
          .fn<
            (
              config: Array<Partial<PageConfig>>,
              baseFileName: string,
              content?: string
            ) => Promise<PageResult[]>
          >()
          .mockResolvedValue([
            {
              baseName: 'direct-config-2',
              sourcePath: 'direct-config-2.md',
              outputPath: '/test-dist/direct-config-2.md',
              success: false,
              error: 'Invalid inheritFrom index -1',
              title: 'Direct Config Page 1',
            },
            {
              baseName: 'direct-config-2.es',
              sourcePath: 'direct-config-2.es.md',
              outputPath: '/test-dist/es/direct-config-2.md',
              success: true,
              title: 'Direct Config Page 23',
              language: 'es',
            },
          ]),
      };
      (renderer as any)._pageParser = mockPageParser;

      const template = `# {{title}}
## {{content}}
`;

      const results = await renderer.buildFromConfiguration(
        invalidConfigurations,
        'direct-config-2',
        template
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Invalid inheritFrom');
      expect(results[1].success).toBe(true);
    });
  });

  describe('Template Rendering', () => {
    it('should render mustache templates correctly', () => {
      const template = '# {{title}}\nThis is **{{content}}**.';
      const variables = {
        title: 'Test Page',
        content: 'test content',
      };

      const result = renderer.render(template, variables);

      expect(result).toBe('# Test Page\nThis is **test content**.');
    });

    it('should handle rendering errors', () => {
      const template = '{{#invalidHelper}}content{{/invalidHelper}}';
      const variables = {};

      // Mock mustache to throw an error
      const originalRender = require('mustache').render;
      require('mustache').render = jest.fn().mockImplementation(() => {
        throw new Error('Template error');
      });

      expect(() => renderer.render(template, variables)).toThrow(
        'Failed to render Mustache template'
      );

      // Restore original
      require('mustache').render = originalRender;
    });

    it('should handle empty rendered output', () => {
      const template = '{{nonexistent}}';
      const variables = {};

      // This should render to empty string, which should throw RenderError
      expect(() => renderer.render(template, variables)).toThrow(
        'Rendered output is empty'
      );
    });
  });

  describe('Full Build Integration', () => {
    it('should perform complete build workflow like example.js', async () => {
      // Mock file system for findYamlFiles
      mockFs.readdir.mockImplementation(async (dir: any) => {
        if (typeof dir === 'string' && dir.includes('test-data')) {
          return [
            { name: 'test.yaml', isFile: () => true, isDirectory: () => false },
            {
              name: 'config.yaml',
              isFile: () => true,
              isDirectory: () => false,
            },
          ] as any;
        }
        return [];
      });

      // Mock PageParser for build process
      const mockPageParser: MockPageParser = {
        processConfigurations: jest.fn(),
        processYamlFile: jest
          .fn<(yamlPath: string) => Promise<PageResult[]>>()
          .mockResolvedValueOnce([
            {
              baseName: 'test',
              sourcePath: 'test.md',
              outputPath: '/test-dist/test.md',
              success: true,
              title: 'Test Page',
            },
          ])
          .mockResolvedValueOnce([
            {
              baseName: 'config',
              sourcePath: 'config.md',
              outputPath: '/test-dist/config.md',
              success: true,
              title: 'Config Page',
            },
          ]),
      };
      (renderer as any)._pageParser = mockPageParser;

      const buildResult = await renderer.build();

      expect(buildResult.success).toBe(true);
      expect(buildResult.totalPages).toBe(2);
      expect(buildResult.successfulPages).toBe(2);
      expect(buildResult.failedPages).toBe(0);
      expect(buildResult.errors).toHaveLength(0);
      expect(buildResult.stats).toBeDefined();
      expect(buildResult.stats!.buildTimeMs).toBeGreaterThanOrEqual(0);

      // Verify pages were processed
      expect(Object.keys(buildResult.pages)).toContain('test.md');
      expect(Object.keys(buildResult.pages)).toContain('config.md');
    });

    it('should handle mixed success and failure scenarios', async () => {
      mockFs.readdir.mockImplementation(async (dir: any) => {
        if (typeof dir === 'string' && dir.includes('test-data')) {
          return [
            {
              name: 'success.yaml',
              isFile: () => true,
              isDirectory: () => false,
            },
            {
              name: 'failure.yaml',
              isFile: () => true,
              isDirectory: () => false,
            },
          ] as any;
        }
        return [];
      });

      const mockPageParser: MockPageParser = {
        processConfigurations: jest.fn(),
        processYamlFile: jest
          .fn<(yamlPath: string) => Promise<PageResult[]>>()
          .mockResolvedValueOnce([
            {
              baseName: 'success',
              sourcePath: 'success.md',
              outputPath: '/test-dist/success.md',
              success: true,
              title: 'Success Page',
            },
          ])
          .mockResolvedValueOnce([
            {
              baseName: 'failure',
              sourcePath: 'failure.md',
              success: false,
              error: 'Processing failed',
              title: 'Failure Page',
            },
          ]),
      };
      (renderer as any)._pageParser = mockPageParser;

      const buildResult = await renderer.build();

      expect(buildResult.success).toBe(false);
      expect(buildResult.totalPages).toBe(2);
      expect(buildResult.successfulPages).toBe(1);
      expect(buildResult.failedPages).toBe(1);
      expect(buildResult.pages['success.md'].success).toBe(true);
      expect(buildResult.pages['failure.md'].success).toBe(false);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should continue processing even when individual files fail', async () => {
      mockFs.readdir.mockImplementation(async (dir: any) => {
        if (typeof dir === 'string' && dir.includes('test-data')) {
          return [
            {
              name: 'good1.yaml',
              isFile: () => true,
              isDirectory: () => false,
            },
            { name: 'bad.yaml', isFile: () => true, isDirectory: () => false },
            {
              name: 'good2.yaml',
              isFile: () => true,
              isDirectory: () => false,
            },
          ] as any;
        }
        return [];
      });

      const mockPageParser: MockPageParser = {
        processConfigurations: jest.fn(),
        processYamlFile: jest
          .fn<(yamlPath: string) => Promise<PageResult[]>>()
          .mockResolvedValueOnce([
            { baseName: 'good1', sourcePath: 'good1.md', success: true },
          ])
          .mockRejectedValueOnce(new Error('Processing failed'))
          .mockResolvedValueOnce([
            { baseName: 'good2', sourcePath: 'good2.md', success: true },
          ]),
      };
      (renderer as any)._pageParser = mockPageParser;

      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const buildResult = await renderer.build();

      expect(buildResult.totalPages).toBe(2); // Only successful pages counted
      expect(buildResult.successfulPages).toBe(2);
      expect(buildResult.failedPages).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing')
      );

      consoleSpy.mockRestore();
    });
  });
});
