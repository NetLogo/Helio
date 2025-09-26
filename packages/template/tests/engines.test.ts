import fs from 'fs/promises';

import { HandlebarsEngine, MustacheEngine } from '../src/engines';
import { RenderError } from '../src/errors';

jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Template Engines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MustacheEngine', () => {
    let engine: MustacheEngine;

    beforeEach(() => {
      engine = new MustacheEngine();
    });

    describe('render', () => {
      it('should render basic mustache template', () => {
        const template = 'Hello {{name}}!';
        const variables = { name: 'World' };
        const result = engine.render(template, variables);
        expect(result).toBe('Hello World!');
      });

      it('should render template with partials', () => {
        engine.registerPartial('greeting', 'Hello {{name}}');
        const template = '{{>greeting}}!';
        const variables = { name: 'World' };
        const result = engine.render(template, variables);
        expect(result).toBe('Hello World!');
      });

      it('should handle complex templates with arrays', () => {
        const template = '{{#items}}{{name}}: {{value}}\n{{/items}}';
        const variables = {
          items: [
            { name: 'A', value: '1' },
            { name: 'B', value: '2' },
          ],
        };
        const result = engine.render(template, variables);
        expect(result).toBe('A: 1\nB: 2\n');
      });

      it('should throw RenderError for empty rendered output', () => {
        const template = '';
        const variables = {};
        expect(() => engine.render(template, variables)).toThrow(RenderError);
        expect(() => engine.render(template, variables)).toThrow(
          'Rendered output is empty'
        );
      });

      it('should throw RenderError for mustache syntax errors', () => {
        // Create an invalid mustache template that will cause an error
        const invalidTemplate = '{{#unclosed';
        const variables = {};
        expect(() => engine.render(invalidTemplate, variables)).toThrow(
          RenderError
        );
        expect(() => engine.render(invalidTemplate, variables)).toThrow(
          'Failed to render Mustache template'
        );
      });
    });

    describe('registerPartial', () => {
      it('should register a partial correctly', () => {
        engine.registerPartial('test', 'Test content: {{value}}');
        const template = '{{>test}}';
        const variables = { value: 'success' };
        const result = engine.render(template, variables);
        expect(result).toBe('Test content: success');
      });

      it('should allow overwriting partials', () => {
        engine.registerPartial('test', 'First content');
        engine.registerPartial('test', 'Second content');
        const template = '{{>test}}';
        const variables = {};
        const result = engine.render(template, variables);
        expect(result).toBe('Second content');
      });
    });

    describe('registerPartialsFromDirectory', () => {
      it('should register partials from directory successfully', async () => {
        const mockFiles = [
          {
            name: 'partial1.mustache',
            isFile: () => true,
            parentPath: '/test/dir',
          },
          {
            name: 'partial2.md',
            isFile: () => true,
            parentPath: '/test/dir',
          },
          {
            name: 'ignored.txt',
            isFile: () => true,
            parentPath: '/test/dir',
          },
          {
            name: 'subdir',
            isFile: () => false,
            parentPath: '/test/dir',
          },
        ];

        mockFs.readdir.mockResolvedValue(mockFiles as any);
        mockFs.readFile
          .mockResolvedValueOnce('Partial 1 content: {{value1}}')
          .mockResolvedValueOnce('Partial 2 content: {{value2}}');

        const result = await engine.registerPartialsFromDirectory('/test/dir');

        expect(mockFs.readdir).toHaveBeenCalledWith('/test/dir', {
          withFileTypes: true,
          recursive: true,
        });
        expect(mockFs.readFile).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          'partial1.mustache': 'Partial 1 content: {{value1}}',
        });
        expect(result[1]).toEqual({
          'partial2.md': 'Partial 2 content: {{value2}}',
        });
      });

      it('should handle file read errors gracefully', async () => {
        const mockFiles = [
          {
            name: 'failing.mustache',
            isFile: () => true,
            parentPath: '/test/dir',
          },
          {
            name: 'working.mustache',
            isFile: () => true,
            parentPath: '/test/dir',
          },
        ];

        mockFs.readdir.mockResolvedValue(mockFiles as any);
        mockFs.readFile
          .mockRejectedValueOnce(new Error('File read error'))
          .mockResolvedValueOnce('Working content');

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await engine.registerPartialsFromDirectory('/test/dir');

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to read partial file: failing.mustache',
          expect.any(Error)
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ 'working.mustache': 'Working content' });

        consoleSpy.mockRestore();
      });

      it('should use custom extensions', async () => {
        const mockFiles = [
          {
            name: 'template.hbs',
            isFile: () => true,
            parentPath: '/test/dir',
          },
          {
            name: 'ignored.mustache',
            isFile: () => true,
            parentPath: '/test/dir',
          },
        ];

        mockFs.readdir.mockResolvedValue(mockFiles as any);
        mockFs.readFile.mockResolvedValue('HBS content');

        const result = await engine.registerPartialsFromDirectory('/test/dir', [
          'hbs',
        ]);

        expect(mockFs.readFile).toHaveBeenCalledTimes(1);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ 'template.hbs': 'HBS content' });
      });
    });
  });

  describe('HandlebarsEngine', () => {
    let engine: HandlebarsEngine;

    beforeEach(() => {
      engine = new HandlebarsEngine();
    });

    describe('render', () => {
      it('should render basic handlebars template', () => {
        const template = 'Hello {{name}}!';
        const variables = { name: 'World' };
        const result = engine.render(template, variables);
        expect(result).toBe('Hello World!');
      });

      it('should render template with helpers', () => {
        const template =
          'Items: {{#each items}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}';
        const variables = { items: ['A', 'B', 'C'] };
        const result = engine.render(template, variables);
        expect(result).toBe('Items: A, B, C');
      });

      it('should handle complex nested objects', () => {
        const template = '{{#with user}}Name: {{name}}, Age: {{age}}{{/with}}';
        const variables = { user: { name: 'John', age: 30 } };
        const result = engine.render(template, variables);
        expect(result).toBe('Name: John, Age: 30');
      });

      it('should throw RenderError for empty rendered output', () => {
        const template = '';
        const variables = {};
        expect(() => engine.render(template, variables)).toThrow(RenderError);
        expect(() => engine.render(template, variables)).toThrow(
          'Rendered output is empty'
        );
      });

      it('should throw RenderError for handlebars syntax errors', () => {
        const invalidTemplate = '{{#unclosed}}';
        const variables = {};
        expect(() => engine.render(invalidTemplate, variables)).toThrow(
          RenderError
        );
        expect(() => engine.render(invalidTemplate, variables)).toThrow(
          'Failed to render Handlebars template'
        );
      });
    });

    describe('registerPartial', () => {
      it('should register and use handlebars partials', () => {
        engine.registerPartial('userInfo', 'Name: {{name}}, Age: {{age}}');
        const template = 'User: {{>userInfo}}';
        const variables = { name: 'Alice', age: 25 };
        const result = engine.render(template, variables);
        expect(result).toBe('User: Name: Alice, Age: 25');
      });

      it('should handle partials with context', () => {
        engine.registerPartial('listItem', '<li>{{name}}: {{value}}</li>');
        const template = '<ul>{{#each items}}{{>listItem}}{{/each}}</ul>';
        const variables = {
          items: [
            { name: 'First', value: '1' },
            { name: 'Second', value: '2' },
          ],
        };
        const result = engine.render(template, variables);
        expect(result).toBe('<ul><li>First: 1</li><li>Second: 2</li></ul>');
      });
    });

    describe('registerPartialsFromDirectory', () => {
      it('should register handlebars partials from directory', async () => {
        const mockFiles = [
          {
            name: 'header.hbs',
            isFile: () => true,
            parentPath: '/templates',
          },
        ];

        mockFs.readdir.mockResolvedValue(mockFiles as any);
        mockFs.readFile.mockResolvedValue('<header>{{title}}</header>');

        const result = await engine.registerPartialsFromDirectory(
          '/templates',
          ['hbs']
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          'header.hbs': '<header>{{title}}</header>',
        });

        // Test that the partial was registered
        const template = '{{>header.hbs}}';
        const variables = { title: 'Test Page' };
        const rendered = engine.render(template, variables);
        expect(rendered).toBe('<header>Test Page</header>');
      });
    });
  });
});
