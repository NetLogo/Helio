import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs/promises';
import { ProjectConfigLoader } from '../src/ProjectConfigLoader.js';
import { JSONParseError, ParseError, ValidationError } from '../src/errors.js';
import { MarkdownProjectConfig } from '../src/schemas.js';

// Mock fs/promises
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ProjectConfigLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('load', () => {
    const validConfig: MarkdownProjectConfig = {
      projectRoot: './project',
      scanRoot: './source',
      outputRoot: './output',
      defaults: {
        language: 'en',
        extension: '.md',
        output: true,
        title: 'Default Title',
        description: 'Default Description',
      },
    };

    it('should load and validate a valid config file', async () => {
      const configPath = '/path/to/config.json';
      const configContent = JSON.stringify(validConfig);

      mockedFs.readFile.mockResolvedValue(configContent);

      const result = await ProjectConfigLoader.load(configPath);

      expect(mockedFs.readFile).toHaveBeenCalledWith(configPath, 'utf-8');
      expect(result).toEqual(validConfig);
    });

    it('should apply default values for missing optional fields', async () => {
      const minimalConfig = {
        defaults: {
          extension: '.md',
          title: 'Test Title',
          description: 'Test Description',
        },
      };
      const configContent = JSON.stringify(minimalConfig);

      mockedFs.readFile.mockResolvedValue(configContent);

      const result = await ProjectConfigLoader.load('/test/config.json');

      expect(result.projectRoot).toBe('.');
      expect(result.scanRoot).toBe('.');
      expect(result.outputRoot).toBe('./dist');
      expect(result.defaults.extension).toBe('.md');
    });

    it('should throw ParseError if file cannot be read', async () => {
      const configPath = '/nonexistent/config.json';
      const error = new Error('ENOENT: no such file or directory');

      mockedFs.readFile.mockRejectedValue(error);

      await expect(ProjectConfigLoader.load(configPath)).rejects.toThrow(
        ParseError
      );
      await expect(ProjectConfigLoader.load(configPath)).rejects.toThrow(
        'Failed to parse file'
      );
      await expect(ProjectConfigLoader.load(configPath)).rejects.toThrow(
        configPath
      );
    });

    it('should throw JSONParseError if file contains invalid JSON', async () => {
      const configPath = '/path/to/invalid-config.json';
      const invalidJson =
        '{ "projectRoot": "./project", "defaults": { "title": }'; // Invalid JSON

      mockedFs.readFile.mockResolvedValue(invalidJson);

      await expect(ProjectConfigLoader.load(configPath)).rejects.toThrow(
        JSONParseError
      );
      await expect(ProjectConfigLoader.load(configPath)).rejects.toThrow(
        'Invalid JSON format'
      );
    });

    it('should throw ValidationError if config does not match schema', async () => {
      const configPath = '/path/to/invalid-config.json';
      const invalidConfig = {
        projectRoot: './project',
        // Missing required 'defaults' field
      };
      const configContent = JSON.stringify(invalidConfig);

      mockedFs.readFile.mockResolvedValue(configContent);

      await expect(ProjectConfigLoader.load(configPath)).rejects.toThrow(
        ValidationError
      );
      await expect(ProjectConfigLoader.load(configPath)).rejects.toThrow(
        'Invalid config format'
      );
    });

    it('should throw ValidationError for invalid defaults structure', async () => {
      const configPath = '/path/to/invalid-config.json';
      const invalidConfig = {
        projectRoot: './project',
        defaults: {
          // Missing required extension field or has wrong type
          extension: 123, // Should be string
          title: 'Test Title',
          description: 'Test Description',
        },
      };
      const configContent = JSON.stringify(invalidConfig);

      mockedFs.readFile.mockResolvedValue(configContent);

      await expect(ProjectConfigLoader.load(configPath)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle complex valid configurations', async () => {
      const complexConfig = {
        projectRoot: '../complex-project',
        scanRoot: './markdown-sources',
        outputRoot: './generated-html',
        defaults: {
          language: 'es',
          extension: '.markdown',
          output: false,
          title: 'Título Predeterminado',
          description: 'Descripción predeterminada del documento',
          shortDescription: 'Descripción corta',
          keywords: ['documentación', 'markdown'],
          tags: ['test', 'complex'],
          authors: [
            {
              name: 'John Doe',
              email: 'john@example.com',
              url: 'https://johndoe.com',
            },
          ],
          buildVariables: {
            version: '2.0.0',
            environment: 'production',
          },
        },
      };
      const configContent = JSON.stringify(complexConfig);

      mockedFs.readFile.mockResolvedValue(configContent);

      const result = await ProjectConfigLoader.load('/path/config.json');

      expect(result.projectRoot).toBe('../complex-project');
      expect(result.defaults.language).toBe('es');
      expect(result.defaults.authors).toHaveLength(1);
      expect(result.defaults.authors![0].name).toBe('John Doe');
      expect(result.defaults.buildVariables).toEqual({
        version: '2.0.0',
        environment: 'production',
      });
    });

    it('should preserve all schema-validated properties', async () => {
      const configPath = '/path/to/config.json';
      const configContent = JSON.stringify(validConfig);

      mockedFs.readFile.mockResolvedValue(configContent);

      const result = await ProjectConfigLoader.load(configPath);

      // Ensure all properties from the original config are preserved
      expect(result).toMatchObject(validConfig);
      expect(Object.keys(result)).toEqual(
        expect.arrayContaining(Object.keys(validConfig))
      );
    });

    it('should handle empty build variables', async () => {
      const configWithEmptyBuildVars = {
        ...validConfig,
        defaults: {
          ...validConfig.defaults,
          buildVariables: {},
        },
      };
      const configContent = JSON.stringify(configWithEmptyBuildVars);

      mockedFs.readFile.mockResolvedValue(configContent);

      const result = await ProjectConfigLoader.load('/path/config.json');

      expect(result.defaults.buildVariables).toEqual({});
    });

    it('should handle null values in JSON gracefully', async () => {
      const configWithNulls = {
        projectRoot: './project',
        scanRoot: null, // This should be handled by defaults
        outputRoot: './output',
        defaults: {
          extension: '.md',
          title: 'Test Title',
          description: 'Test Description',
          language: null, // Optional field
        },
      };
      const configContent = JSON.stringify(configWithNulls);

      mockedFs.readFile.mockResolvedValue(configContent);

      // This should either work or throw ValidationError depending on schema
      await expect(async () => {
        await ProjectConfigLoader.load('/path/config.json');
      }).rejects.toThrow(); // We expect this to fail validation
    });

    it('should validate extension field default value', async () => {
      const configWithoutExtension = {
        projectRoot: './project',
        defaults: {
          title: 'Test Title',
          description: 'Test Description',
          // extension should default to '.md'
        },
      };
      const configContent = JSON.stringify(configWithoutExtension);

      mockedFs.readFile.mockResolvedValue(configContent);

      const result = await ProjectConfigLoader.load('/path/config.json');

      expect(result.defaults.extension).toBe('.md');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle file read errors with detailed information', async () => {
      const configPath = '/protected/config.json';
      const error = Object.assign(new Error('Permission denied'), {
        code: 'EACCES',
      });

      mockedFs.readFile.mockRejectedValue(error);

      try {
        await ProjectConfigLoader.load(configPath);
        fail('Expected ParseError to be thrown');
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(ParseError);
        expect(thrown.message).toContain(configPath);
        expect(thrown.message).toContain('Permission denied');
      }
    });

    it('should handle JSON syntax errors with detailed information', async () => {
      const configPath = '/path/config.json';
      const malformedJson =
        '{"projectRoot": "./test", "defaults": {"title": "Test"'; // Missing closing braces

      mockedFs.readFile.mockResolvedValue(malformedJson);

      try {
        await ProjectConfigLoader.load(configPath);
        fail('Expected JSONParseError to be thrown');
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(JSONParseError);
        expect(thrown).toBeInstanceOf(ParseError); // Should inherit from ParseError
        expect(thrown.message).toContain('Invalid JSON format');
        expect(thrown.message).toContain(configPath);
      }
    });

    it('should provide detailed validation errors', async () => {
      const configPath = '/path/config.json';
      const configWithMultipleErrors = {
        projectRoot: 123, // Should be string
        defaults: 'invalid', // Should be object
      };
      const configContent = JSON.stringify(configWithMultipleErrors);

      mockedFs.readFile.mockResolvedValue(configContent);

      try {
        await ProjectConfigLoader.load(configPath);
        fail('Expected ValidationError to be thrown');
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(ValidationError);
        expect(thrown.message).toContain('Invalid config format');
        // Should contain details about what went wrong
        expect(thrown.message.length).toBeGreaterThan(50);
      }
    });
  });
});
