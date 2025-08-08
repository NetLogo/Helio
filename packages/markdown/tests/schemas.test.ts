import { describe, expect, it } from '@jest/globals';
import {
  AuthorDeclarationSchema,
  BuildVariablesDeclarationSchema,
  MarkdownPageDeclarationSchema,
  ProjectConfigSchema,
  type MarkdownPageConfig,
  type MarkdownProjectConfig,
} from '../src/schemas.js';

describe('schemas', () => {
  describe('BuildVariablesDeclarationSchema', () => {
    it('should validate valid build variables', () => {
      const valid = {
        variable1: 'value1',
        variable2: 'value2',
      };
      expect(() => BuildVariablesDeclarationSchema.parse(valid)).not.toThrow();
    });

    it('should reject non-string values', () => {
      const invalid = {
        variable1: 123,
        variable2: 'value2',
      };
      expect(() => BuildVariablesDeclarationSchema.parse(invalid)).toThrow();
    });

    it('should handle non-string keys by converting them', () => {
      const mixed = {
        123: 'value1',
        variable2: 'value2',
      };
      // Zod record schema converts numeric keys to strings
      expect(() => BuildVariablesDeclarationSchema.parse(mixed)).not.toThrow();
    });
  });

  describe('AuthorDeclarationSchema', () => {
    it('should validate author with name only', () => {
      const valid = {
        name: 'John Doe',
      };
      expect(() => AuthorDeclarationSchema.parse(valid)).not.toThrow();
    });

    it('should validate author with all fields', () => {
      const valid = {
        name: 'John Doe',
        email: 'john@example.com',
        url: 'https://johndoe.com',
      };
      expect(() => AuthorDeclarationSchema.parse(valid)).not.toThrow();
    });

    it('should require name field', () => {
      const invalid = {
        email: 'john@example.com',
      };
      expect(() => AuthorDeclarationSchema.parse(invalid)).toThrow();
    });

    it('should allow optional email and url', () => {
      const valid = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      const result = AuthorDeclarationSchema.parse(valid);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.url).toBeUndefined();
    });
  });

  describe('MarkdownPageDeclarationSchema', () => {
    it('should validate minimal page configuration', () => {
      const valid = {};
      expect(() => MarkdownPageDeclarationSchema.parse(valid)).not.toThrow();
    });

    it('should validate full page configuration', () => {
      const valid = {
        inheritFrom: [0, 1],
        language: 'en',
        output: true,
        buildVariables: {
          var1: 'value1',
        },
        extension: '.md',
        title: 'Test Page',
        description: 'A test page',
        shortDescription: 'Test',
        keywords: ['test', 'page'],
        tags: ['testing'],
        authors: [
          {
            name: 'John Doe',
            email: 'john@example.com',
          },
        ],
      };
      const result = MarkdownPageDeclarationSchema.parse(valid);
      expect(result.title).toBe('Test Page');
      expect(result.language).toBe('en');
      expect(result.output).toBe(true);
    });

    it('should set default extension to .md', () => {
      const config = {};
      const result = MarkdownPageDeclarationSchema.parse(config);
      expect(result.extension).toBe('.md');
    });

    it('should validate inheritFrom as array of numbers', () => {
      const valid = {
        inheritFrom: [0, 1, 2],
      };
      expect(() => MarkdownPageDeclarationSchema.parse(valid)).not.toThrow();
    });

    it('should reject inheritFrom with non-numbers', () => {
      const invalid = {
        inheritFrom: [0, 'invalid', 2],
      };
      expect(() => MarkdownPageDeclarationSchema.parse(invalid)).toThrow();
    });

    it('should validate keywords as array of strings', () => {
      const valid = {
        keywords: ['keyword1', 'keyword2'],
      };
      expect(() => MarkdownPageDeclarationSchema.parse(valid)).not.toThrow();
    });

    it('should validate tags as array of strings', () => {
      const valid = {
        tags: ['tag1', 'tag2'],
      };
      expect(() => MarkdownPageDeclarationSchema.parse(valid)).not.toThrow();
    });

    it('should validate authors array', () => {
      const valid = {
        authors: [
          { name: 'Author 1' },
          { name: 'Author 2', email: 'author2@example.com' },
        ],
      };
      expect(() => MarkdownPageDeclarationSchema.parse(valid)).not.toThrow();
    });
  });

  describe('ProjectConfigSchema', () => {
    it('should validate minimal project configuration', () => {
      const valid = {
        defaults: {},
      };
      expect(() => ProjectConfigSchema.parse(valid)).not.toThrow();
    });

    it('should set default values', () => {
      const config = {
        defaults: {},
      };
      const result = ProjectConfigSchema.parse(config);
      expect(result.projectRoot).toBe('.');
      expect(result.scanRoot).toBe('.');
      expect(result.outputRoot).toBe('./dist');
    });

    it('should validate full project configuration', () => {
      const valid = {
        projectRoot: './my-project',
        scanRoot: './source',
        outputRoot: './build',
        defaults: {
          language: 'en',
          title: 'Default Title',
          description: 'Default Description',
        },
      };
      const result = ProjectConfigSchema.parse(valid);
      expect(result.projectRoot).toBe('./my-project');
      expect(result.scanRoot).toBe('./source');
      expect(result.outputRoot).toBe('./build');
      expect(result.defaults.language).toBe('en');
    });

    it('should require defaults field', () => {
      const invalid = {
        projectRoot: './my-project',
      };
      expect(() => ProjectConfigSchema.parse(invalid)).toThrow();
    });

    it('should validate nested defaults configuration', () => {
      const valid = {
        defaults: {
          language: 'es',
          output: false,
          title: 'Título por defecto',
          description: 'Una descripción por defecto',
          buildVariables: {
            version: '1.0.0',
          },
        },
      };
      expect(() => ProjectConfigSchema.parse(valid)).not.toThrow();
    });
  });

  describe('Type exports', () => {
    it('should export MarkdownProjectConfig type', () => {
      const config: MarkdownProjectConfig = {
        projectRoot: '.',
        scanRoot: '.',
        outputRoot: './dist',
        defaults: {
          title: 'Test',
          description: 'Test description',
          extension: '.md',
        },
      };
      expect(config).toBeDefined();
    });

    it('should export MarkdownPageConfig type', () => {
      const config: MarkdownPageConfig = {
        title: 'Test Page',
        description: 'Test description',
        language: 'en',
        output: true,
        extension: '.md',
      };
      expect(config).toBeDefined();
    });
  });
});
