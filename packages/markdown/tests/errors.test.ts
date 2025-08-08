import { describe, expect, it } from '@jest/globals';
import {
  FileFetchError,
  FileNotFoundError,
  InitializationError,
  JSONParseError,
  ParseError,
  RenderError,
  UnsupportedFileTypeError,
  ValidationError,
} from '../src/errors.js';

describe('errors', () => {
  describe('FileNotFoundError', () => {
    it('should create error with correct message and name', () => {
      const filePath = '/path/to/file.txt';
      const error = new FileNotFoundError(filePath);

      expect(error.message).toBe(`File not found: ${filePath}`);
      expect(error.name).toBe('FileNotFoundError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('FileFetchError', () => {
    it('should create error with file path and message', () => {
      const filePath = '/path/to/file.txt';
      const originalMessage = 'Network error';
      const error = new FileFetchError(filePath, originalMessage);

      expect(error.message).toBe(
        `Failed to fetch file ${filePath}: ${originalMessage}`
      );
      expect(error).toBeInstanceOf(Error);
    });

    it('should handle unknown error types', () => {
      const filePath = '/path/to/file.txt';
      const error = new FileFetchError(filePath, { code: 'ENOENT' });

      expect(error.message).toContain('Failed to fetch file');
      expect(error.message).toContain(filePath);
    });
  });

  describe('ParseError', () => {
    it('should create error with file path and message', () => {
      const filePath = '/path/to/file.yaml';
      const originalMessage = 'Invalid YAML syntax';
      const error = new ParseError(filePath, originalMessage);

      expect(error.message).toBe(
        `Failed to parse file ${filePath}: ${originalMessage}`
      );
      expect(error.name).toBe('ParseError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('JSONParseError', () => {
    it('should extend ParseError with JSON-specific message', () => {
      const filePath = '/path/to/config.json';
      const originalMessage = 'Unexpected token';
      const error = new JSONParseError(filePath, originalMessage);

      expect(error.message).toBe(
        `Failed to parse file ${filePath}: Invalid JSON format: ${originalMessage}`
      );
      expect(error.name).toBe('JSONParseError');
      expect(error).toBeInstanceOf(ParseError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should handle object error messages', () => {
      const filePath = '/path/to/config.json';
      const error = new JSONParseError(filePath, { message: 'Syntax error' });

      expect(error.message).toContain('Invalid JSON format');
      expect(error.message).toContain(filePath);
    });
  });

  describe('UnsupportedFileTypeError', () => {
    it('should create error with file path', () => {
      const filePath = '/path/to/file.unknown';
      const error = new UnsupportedFileTypeError(filePath);

      expect(error.message).toBe(`Unsupported file type: ${filePath}`);
      expect(error.name).toBe('UnsupportedFileTypeError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ValidationError', () => {
    it('should create error with validation message', () => {
      const message = 'Schema validation failed';
      const error = new ValidationError(message);

      expect(error.message).toBe(`Validation error: ${message}`);
      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('InitializationError', () => {
    it('should create error with initialization message', () => {
      const message = 'Failed to load configuration';
      const error = new InitializationError(message);

      expect(error.message).toBe(`Initialization error: ${message}`);
      expect(error.name).toBe('InitializationError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('RenderError', () => {
    it('should create error with render message only', () => {
      const message = 'Template compilation failed';
      const error = new RenderError(message);

      expect(error.message).toBe(`Render error: ${message}\n`);
      expect(error.name).toBe('RenderError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create error with render message and cause', () => {
      const message = 'Template compilation failed';
      const cause = 'Undefined variable: title';
      const error = new RenderError(message, cause);

      expect(error.message).toBe(
        `Render error: ${message}\nCaused by: ${cause}`
      );
      expect(error.name).toBe('RenderError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should handle empty cause string', () => {
      const message = 'Template compilation failed';
      const error = new RenderError(message, '');

      expect(error.message).toBe(`Render error: ${message}\n`);
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const errors = [
        new FileNotFoundError('/test'),
        new FileFetchError('/test', 'message'),
        new ParseError('/test', 'message'),
        new JSONParseError('/test', 'message'),
        new UnsupportedFileTypeError('/test'),
        new ValidationError('message'),
        new InitializationError('message'),
        new RenderError('message'),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.stack).toBeDefined();
        expect(typeof error.toString).toBe('function');
      });
    });

    it('should allow error catching by type', () => {
      const parseError = new ParseError('/test', 'message');
      const jsonParseError = new JSONParseError('/test', 'message');

      expect(parseError).toBeInstanceOf(ParseError);
      expect(jsonParseError).toBeInstanceOf(ParseError);
      expect(jsonParseError).toBeInstanceOf(JSONParseError);
    });
  });
});
