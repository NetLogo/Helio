import fs from 'fs/promises';

import PageParser from '../src/PageParser.js';
import MarkdownRenderer from '../src/Renderer.js';
import { MarkdownProjectConfig } from '../src/schemas.js';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../src/Renderer.js');

const mockFs = fs as jest.Mocked<typeof fs>;
const MockRenderer = MarkdownRenderer as jest.MockedClass<
  typeof MarkdownRenderer
>;

describe('PageParser.processConfigurations', () => {
  let pageParser: PageParser;
  let mockRenderer: jest.Mocked<MarkdownRenderer>;
  let mockProjectConfig: MarkdownProjectConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProjectConfig = {
      projectRoot: '/absolute/project',
      scanRoot: '/absolute/scan',
      outputRoot: 'dist',
      defaults: {
        extension: 'md',
        language: 'en',
        output: false,
      },
    };

    mockRenderer = new MockRenderer('') as jest.Mocked<MarkdownRenderer>;
    mockRenderer.projectRoot = '/absolute/project';
    mockRenderer.scanRoot = '/absolute/scan';
    mockRenderer.render.mockReturnValue('<p>Test HTML</p>');
    mockRenderer.loadBuildVariable.mockResolvedValue({ data: 'build-value' });

    pageParser = new PageParser(mockRenderer, mockProjectConfig);

    // Mock file system operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue();
    mockFs.readFile.mockResolvedValue('# {{title}}\n\n{{description}}');
  });

  describe('basic functionality', () => {
    it('should process configurations with markdown content', async () => {
      const configs = [
        {
          title: 'Dynamic Page',
          description: 'Generated programmatically',
          language: 'en',
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'dynamic-test',
        '# {{title}}\n\n{{description}}'
      );

      expect(mockRenderer.render).toHaveBeenCalledWith(
        '# {{title}}\n\n{{description}}',
        expect.objectContaining({
          title: 'Dynamic Page',
          description: 'Generated programmatically',
        })
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/absolute/project/dist/dynamic-test.html',
        '<p>Test HTML</p>',
        'utf-8'
      );
    });

    it('should process configurations without markdown content (reads from file)', async () => {
      const configs = [
        {
          title: 'File-based Page',
          output: true,
        },
      ];

      await pageParser.processConfigurations(configs, 'file-test');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/absolute/scan/file-test.md',
        'utf-8'
      );
      expect(mockRenderer.render).toHaveBeenCalledWith(
        '# {{title}}\n\n{{description}}',
        expect.objectContaining({
          title: 'File-based Page',
        })
      );
    });

    it('should skip configurations without output enabled', async () => {
      const configs = [
        {
          title: 'Hidden Page',
          output: false,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'hidden-test',
        '# {{title}}'
      );

      expect(mockRenderer.render).not.toHaveBeenCalled();
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle empty configurations array', async () => {
      await pageParser.processConfigurations([], 'empty-test');

      expect(mockRenderer.render).not.toHaveBeenCalled();
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('inheritance processing', () => {
    it('should apply inheritance from other configurations', async () => {
      const configs = [
        {
          title: 'Base Config',
          description: 'Base description',
          language: 'en',
          // Don't set output on parent - let child control rendering
        },
        {
          title: 'Child Config',
          inheritFrom: [0],
          output: true, // Only child will be rendered
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'inheritance-test',
        '# {{title}}\n\n{{description}}'
      );

      expect(mockRenderer.render).toHaveBeenCalledWith(
        '# {{title}}\n\n{{description}}',
        expect.objectContaining({
          title: 'Base Config', // Parent title overwrites child (inheritance behavior)
          description: 'Base description',
        })
      );
    });

    it('should handle multiple inheritance sources', async () => {
      const configs = [
        { title: 'First Base' }, // No output specified
        { description: 'Second Base' }, // No output specified
        {
          title: 'Child',
          inheritFrom: [0, 1],
          output: true, // Only this will be rendered
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'multi-inheritance-test',
        '# {{title}}\n\n{{description}}'
      );

      expect(mockRenderer.render).toHaveBeenCalledWith(
        '# {{title}}\n\n{{description}}',
        expect.objectContaining({
          title: 'First Base', // Later inheritance overwrites earlier
          description: 'Second Base',
        })
      );
    });

    it('should handle invalid inheritance indices gracefully', async () => {
      const configs = [
        {
          title: 'Child Config',
          inheritFrom: [999], // Invalid index
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'invalid-inheritance-test',
        '# {{title}}'
      );

      expect(mockRenderer.render).toHaveBeenCalled();
      // Should not throw error
    });
  });

  describe('build variables processing', () => {
    it('should load external build variables', async () => {
      const configs = [
        {
          title: 'Build Vars Page',
          buildVariables: {
            externalVar: 'path/to/var.json',
          },
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'build-vars-test',
        '# {{title}}\n\n{{externalVar}}'
      );

      expect(mockRenderer.loadBuildVariable).toHaveBeenCalledWith(
        'path/to/var.json'
      );
      expect(mockRenderer.render).toHaveBeenCalledWith(
        '# {{title}}\n\n{{externalVar}}',
        expect.objectContaining({
          externalVar: { data: 'build-value' },
        })
      );
    });

    it('should handle missing buildVariables', async () => {
      const configs = [
        {
          title: 'No Build Vars',
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'no-build-vars-test',
        '# {{title}}'
      );

      expect(mockRenderer.loadBuildVariable).not.toHaveBeenCalled();
      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('should handle build variable loading errors', async () => {
      mockRenderer.loadBuildVariable.mockRejectedValue(
        new Error('Build var error')
      );

      const configs = [
        {
          title: 'Error Page',
          buildVariables: {
            failingVar: 'invalid/path.json',
          },
          output: true,
        },
      ];

      await expect(
        pageParser.processConfigurations(configs, 'error-test', '# {{title}}')
      ).rejects.toThrow('Build var error');
    });
  });

  describe('file path generation', () => {
    it('should generate correct paths for default language', async () => {
      const configs = [
        {
          title: 'Default Lang',
          language: 'en', // Default language
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'default-lang-test',
        '# {{title}}'
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/absolute/project/dist/default-lang-test.html',
        '<p>Test HTML</p>',
        'utf-8'
      );
    });

    it('should generate correct paths for non-default language', async () => {
      const configs = [
        {
          title: 'Spanish Page',
          language: 'es',
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'spanish-test',
        '# {{title}}'
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/absolute/project/dist/es/spanish-test.html',
        '<p>Test HTML</p>',
        'utf-8'
      );
    });

    it('should handle custom extensions', async () => {
      const configs = [
        {
          title: 'Custom Extension',
          extension: 'txt',
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'custom-ext-test'
        // No markdown content provided, should read from file
      );

      // When reading from file system (no markdown content provided)
      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/absolute/scan/custom-ext-test.txt',
        'utf-8'
      );
    });

    it('should handle custom output root', async () => {
      const customConfig = { ...mockProjectConfig, outputRoot: 'custom-dist' };
      pageParser = new PageParser(mockRenderer, customConfig);

      const configs = [
        {
          title: 'Custom Output',
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'custom-output-test',
        '# {{title}}'
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/absolute/project/custom-dist/custom-output-test.html',
        '<p>Test HTML</p>',
        'utf-8'
      );
    });
  });

  describe('metadata generation', () => {
    it('should generate metadata JSON files', async () => {
      const configs = [
        {
          title: 'Metadata Page',
          description: 'Has metadata',
          tags: ['test', 'metadata'],
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'metadata-test',
        '# {{title}}'
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/absolute/project/dist/metadata-test.metadata.json',
        JSON.stringify(
          {
            source: 'metadata-test.md',
            extension: 'md',
            language: 'en',
            output: true,
            title: 'Metadata Page',
            description: 'Has metadata',
            tags: ['test', 'metadata'],
          },
          null,
          2
        ),
        'utf-8'
      );
    });
  });

  describe('directory creation', () => {
    it('should create output directories recursively', async () => {
      const configs = [
        {
          title: 'Directory Test',
          language: 'fr',
          output: true,
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'nested/deep/path',
        '# {{title}}'
      );

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        '/absolute/project/dist/fr/nested/deep',
        { recursive: true }
      );
    });
  });

  describe('error handling', () => {
    it('should handle file writing errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write error'));

      const configs = [
        {
          title: 'Error Page',
          output: true,
        },
      ];

      await expect(
        pageParser.processConfigurations(configs, 'error-test', '# {{title}}')
      ).rejects.toThrow('Write error');
    });

    it('should handle render errors', async () => {
      mockRenderer.render.mockImplementation(() => {
        throw new Error('Render error');
      });

      const configs = [
        {
          title: 'Render Error',
          output: true,
        },
      ];

      await expect(
        pageParser.processConfigurations(
          configs,
          'render-error-test',
          '# {{title}}'
        )
      ).rejects.toThrow('Render error');
    });

    it('should handle file reading errors when no markdown content provided', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File read error'));

      const configs = [
        {
          title: 'File Error',
          output: true,
        },
      ];

      await expect(
        pageParser.processConfigurations(configs, 'file-error-test')
      ).rejects.toThrow('File read error');
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed output and non-output configurations', async () => {
      const configs = [
        {
          title: 'Hidden Base',
          description: 'Base config',
          // No output specified - defaults to false
        },
        {
          title: 'Visible Page',
          inheritFrom: [0],
          output: true, // Only this generates output
        },
        {
          title: 'Another Hidden',
          // No output specified - defaults to false
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'mixed-test',
        '# {{title}}\n\n{{description}}'
      );

      // Only one configuration should generate output
      expect(mockRenderer.render).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2); // HTML + metadata
    });

    it('should handle null and undefined configurations gracefully', async () => {
      const configs = [
        null,
        {
          title: 'Valid Config',
          output: true,
        },
        undefined,
      ];

      await pageParser.processConfigurations(
        configs,
        'null-undefined-test',
        '# {{title}}'
      );

      expect(mockRenderer.render).toHaveBeenCalledTimes(1);
    });

    it('should handle inheritance with null/undefined configurations', async () => {
      const configs = [
        null,
        {
          title: 'Valid Base',
          // No output specified - defaults to false, but child will have output: true
        },
        {
          title: 'Child',
          inheritFrom: [0, 1], // Mix of null and valid
          output: true, // Only this generates output
        },
      ];

      await pageParser.processConfigurations(
        configs,
        'inheritance-null-test',
        '# {{title}}'
      );

      expect(mockRenderer.render).toHaveBeenCalledWith(
        '# {{title}}',
        expect.objectContaining({
          title: 'Valid Base', // Should inherit from valid config
        })
      );
    });
  });
});
