import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import ini from 'ini';
import yaml from 'yaml';
import { BuildVariablesLoader } from '../src/BuildVariablesLoader.js';
import {
  FileFetchError,
  ParseError,
  UnsupportedFileTypeError,
} from '../src/errors.js';
import * as utils from '../src/utils.js';

// Mock the utils module
jest.mock('../src/utils.js');

const mockIsURL = jest.mocked(utils.isURL);
const mockReadLocal = jest.mocked(utils.readLocal);
const mockReadRemote = jest.mocked(utils.readRemote);
const mockGetFileExtension = jest.mocked(utils.getFileExtension);

describe('BuildVariablesLoader', () => {
  let loader: BuildVariablesLoader;
  const mockScanRoot = '/test/root';

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new BuildVariablesLoader(mockScanRoot);
  });

  describe('constructor', () => {
    it('should create instance with scan root', () => {
      const testLoader = new BuildVariablesLoader('/custom/path');
      expect(testLoader).toBeInstanceOf(BuildVariablesLoader);
    });
  });

  describe('supportedFileTypes getter', () => {
    it('should return joined supported extensions', () => {
      const expected =
        '.js, .ts, .jsx, .tsx, .yml, .yaml, .ini, .xml, .nlogox, .json';
      expect(loader.supportedFileTypes).toBe(expected);
    });
  });

  describe('fetch', () => {
    describe('remote URLs', () => {
      it('should fetch from remote URL when isURL returns true', async () => {
        const testUrl = 'https://example.com/config.yaml';
        const testContent = 'remote content';

        mockIsURL.mockReturnValue(true);
        mockReadRemote.mockResolvedValue(testContent);

        const result = await loader.fetch(testUrl);

        expect(mockIsURL).toHaveBeenCalledWith(testUrl);
        expect(mockReadRemote).toHaveBeenCalledWith(testUrl);
        expect(mockReadLocal).not.toHaveBeenCalled();
        expect(result).toBe(testContent);
      });

      it('should handle remote fetch errors', async () => {
        const testUrl = 'https://example.com/config.yaml';
        const mockError = new Error('Network error');

        mockIsURL.mockReturnValue(true);
        mockReadRemote.mockRejectedValue(mockError);

        await expect(loader.fetch(testUrl)).rejects.toThrow('Network error');
        expect(mockReadRemote).toHaveBeenCalledWith(testUrl);
      });
    });

    describe('local files', () => {
      it('should fetch from local file when isURL returns false', async () => {
        const testPath = 'config/build.yaml';
        const testContent = 'local content';
        const expectedFullPath = '/test/root/config/build.yaml';

        mockIsURL.mockReturnValue(false);
        mockReadLocal.mockResolvedValue(testContent);

        const result = await loader.fetch(testPath);

        expect(mockIsURL).toHaveBeenCalledWith(testPath);
        expect(mockReadLocal).toHaveBeenCalledWith(expectedFullPath);
        expect(mockReadRemote).not.toHaveBeenCalled();
        expect(result).toBe(testContent);
      });

      it('should handle local file read errors', async () => {
        const testPath = 'config/build.yaml';
        const mockError = new Error('File not found');

        mockIsURL.mockReturnValue(false);
        mockReadLocal.mockRejectedValue(mockError);

        await expect(loader.fetch(testPath)).rejects.toThrow('File not found');
        expect(mockReadLocal).toHaveBeenCalledWith(
          '/test/root/config/build.yaml'
        );
      });

      it('should handle absolute paths correctly', async () => {
        const testPath = '/absolute/path/config.yaml';
        const testContent = 'absolute content';

        mockIsURL.mockReturnValue(false);
        mockReadLocal.mockResolvedValue(testContent);

        const result = await loader.fetch(testPath);

        expect(mockReadLocal).toHaveBeenCalledWith(
          '/test/root/absolute/path/config.yaml'
        );
        expect(result).toBe(testContent);
      });
    });
  });

  describe('load', () => {
    const mockFilePath = 'test-file';
    const mockFileContent = 'file content';

    beforeEach(() => {
      // Mock fetch to return test content
      jest.spyOn(loader, 'fetch').mockResolvedValue(mockFileContent);
    });

    describe('YAML files', () => {
      it('should parse .yaml files', async () => {
        const yamlContent = 'key: value\nlist:\n  - item1\n  - item2';
        const expectedResult = { key: 'value', list: ['item1', 'item2'] };

        mockGetFileExtension.mockReturnValue('.yaml');
        jest.spyOn(loader, 'fetch').mockResolvedValue(yamlContent);
        jest.spyOn(yaml, 'parse').mockReturnValue(expectedResult);

        const result = await loader.load('config.yaml');

        expect(mockGetFileExtension).toHaveBeenCalledWith('config.yaml');
        expect(yaml.parse).toHaveBeenCalledWith(yamlContent);
        expect(result).toEqual(expectedResult);
      });

      it('should parse .yml files', async () => {
        const yamlContent = 'key: value';
        const expectedResult = { key: 'value' };

        mockGetFileExtension.mockReturnValue('.yml');
        jest.spyOn(loader, 'fetch').mockResolvedValue(yamlContent);
        jest.spyOn(yaml, 'parse').mockReturnValue(expectedResult);

        const result = await loader.load('config.yml');

        expect(yaml.parse).toHaveBeenCalledWith(yamlContent);
        expect(result).toEqual(expectedResult);
      });

      it('should handle YAML parsing errors', async () => {
        const invalidYaml = 'invalid: yaml: content:';

        mockGetFileExtension.mockReturnValue('.yaml');
        jest.spyOn(loader, 'fetch').mockResolvedValue(invalidYaml);
        jest.spyOn(yaml, 'parse').mockImplementation(() => {
          throw new Error('YAML parse error');
        });

        await expect(loader.load('invalid.yaml')).rejects.toThrow(ParseError);
        await expect(loader.load('invalid.yaml')).rejects.toThrow(
          'YAML parse error'
        );
      });
    });

    describe('JSON files', () => {
      it('should parse .json files', async () => {
        const jsonContent = '{"key": "value", "number": 42}';
        const expectedResult = { key: 'value', number: 42 };

        mockGetFileExtension.mockReturnValue('.json');
        jest.spyOn(loader, 'fetch').mockResolvedValue(jsonContent);

        const result = await loader.load('config.json');

        expect(result).toEqual(expectedResult);
      });

      it('should handle JSON parsing errors', async () => {
        const invalidJson = '{"invalid": json}';

        mockGetFileExtension.mockReturnValue('.json');
        jest.spyOn(loader, 'fetch').mockResolvedValue(invalidJson);

        await expect(loader.load('invalid.json')).rejects.toThrow(ParseError);
      });

      it('should parse JSON arrays', async () => {
        const jsonArray = '[{"item": 1}, {"item": 2}]';
        const expectedResult = [{ item: 1 }, { item: 2 }];

        mockGetFileExtension.mockReturnValue('.json');
        jest.spyOn(loader, 'fetch').mockResolvedValue(jsonArray);

        const result = await loader.load('array.json');

        expect(result).toEqual(expectedResult);
      });
    });

    describe('INI files', () => {
      it('should parse .ini files', async () => {
        const iniContent =
          '[section1]\nkey1=value1\nkey2=value2\n[section2]\nkey3=value3';
        const expectedResult = {
          section1: { key1: 'value1', key2: 'value2' },
          section2: { key3: 'value3' },
        };

        mockGetFileExtension.mockReturnValue('.ini');
        jest.spyOn(loader, 'fetch').mockResolvedValue(iniContent);
        jest.spyOn(ini, 'parse').mockReturnValue(expectedResult);

        const result = await loader.load('config.ini');

        expect(ini.parse).toHaveBeenCalledWith(iniContent);
        expect(result).toEqual(expectedResult);
      });

      it('should handle INI parsing errors', async () => {
        const invalidIni = 'invalid ini content without sections';

        mockGetFileExtension.mockReturnValue('.ini');
        jest.spyOn(loader, 'fetch').mockResolvedValue(invalidIni);
        jest.spyOn(ini, 'parse').mockImplementation(() => {
          throw new Error('INI parse error');
        });

        await expect(loader.load('invalid.ini')).rejects.toThrow(ParseError);
        await expect(loader.load('invalid.ini')).rejects.toThrow(
          'INI parse error'
        );
      });
    });

    describe('unsupported file types', () => {
      it('should throw UnsupportedFileTypeError for unsupported extensions', async () => {
        mockGetFileExtension.mockReturnValue('.txt');
        jest.spyOn(loader, 'fetch').mockResolvedValue('some content');

        await expect(loader.load('config.txt')).rejects.toThrow(
          UnsupportedFileTypeError
        );
        await expect(loader.load('config.txt')).rejects.toThrow(
          'Unsupported file type: .txt for config.txt'
        );
      });

      it('should throw UnsupportedFileTypeError for files without extensions', async () => {
        mockGetFileExtension.mockReturnValue('');
        jest.spyOn(loader, 'fetch').mockResolvedValue('some content');

        await expect(loader.load('config')).rejects.toThrow(
          UnsupportedFileTypeError
        );
      });

      it('should throw UnsupportedFileTypeError for unknown extensions', async () => {
        mockGetFileExtension.mockReturnValue('.unknown');
        jest.spyOn(loader, 'fetch').mockResolvedValue('some content');

        await expect(loader.load('config.unknown')).rejects.toThrow(
          UnsupportedFileTypeError
        );
      });
    });

    describe('fetch errors', () => {
      it('should throw FileFetchError when fetch fails', async () => {
        mockGetFileExtension.mockReturnValue('.yaml');

        const testPath = 'nonexistent.yaml';
        const fetchError = new Error('File not found');

        jest.spyOn(loader, 'fetch').mockRejectedValue(fetchError);

        await expect(loader.load(testPath)).rejects.toThrow(FileFetchError);
        await expect(loader.load(testPath)).rejects.toThrow('File not found');
      });

      it('should preserve original error message in FileFetchError', async () => {
        mockGetFileExtension.mockReturnValue('.yaml');

        const testPath = 'network-error.yaml';
        const originalError = new Error('Network timeout');

        jest.spyOn(loader, 'fetch').mockRejectedValue(originalError);

        try {
          await loader.load(testPath);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(FileFetchError);
          expect((error as FileFetchError).message).toContain(
            'Network timeout'
          );
          expect((error as FileFetchError).message).toContain(testPath);
        }
      });
    });

    describe('case sensitivity', () => {
      it('should handle uppercase extensions', async () => {
        const yamlContent = 'key: value';
        const expectedResult = { key: 'value' };

        mockGetFileExtension.mockReturnValue('.YAML');
        jest.spyOn(loader, 'fetch').mockResolvedValue(yamlContent);
        jest.spyOn(yaml, 'parse').mockReturnValue(expectedResult);

        const result = await loader.load('CONFIG.YAML');

        expect(yaml.parse).toHaveBeenCalledWith(yamlContent);
        expect(result).toEqual(expectedResult);
      });

      it('should handle mixed case extensions', async () => {
        const jsonContent = '{"key": "value"}';

        mockGetFileExtension.mockReturnValue('.Json');
        jest.spyOn(loader, 'fetch').mockResolvedValue(jsonContent);

        const result = await loader.load('config.Json');

        expect(result).toEqual({ key: 'value' });
      });
    });
  });

  describe('integration scenarios', () => {
    it('should load complex YAML with nested structures', async () => {
      const complexYaml = `
config:
  database:
    host: localhost
    port: 5432
  features:
    - authentication
    - logging
metadata:
  version: 1.0.0
  authors:
    - name: John Doe
      email: john@example.com
`;
      const expectedResult = {
        config: {
          database: {
            host: 'localhost',
            port: 5432,
          },
          features: ['authentication', 'logging'],
        },
        metadata: {
          version: '1.0.0',
          authors: [
            {
              name: 'John Doe',
              email: 'john@example.com',
            },
          ],
        },
      };

      mockGetFileExtension.mockReturnValue('.yaml');
      jest.spyOn(loader, 'fetch').mockResolvedValue(complexYaml);
      jest.spyOn(yaml, 'parse').mockReturnValue(expectedResult);

      const result = await loader.load('complex.yaml');

      expect(result).toEqual(expectedResult);
    });

    it('should handle empty files gracefully', async () => {
      mockGetFileExtension.mockReturnValue('.json');
      jest.spyOn(loader, 'fetch').mockResolvedValue('');

      await expect(loader.load('empty.json')).rejects.toThrow(ParseError);
    });

    it('should handle files with only whitespace', async () => {
      const whitespaceYaml = '   \n\t  \n  ';

      mockGetFileExtension.mockReturnValue('.yaml');
      jest.spyOn(loader, 'fetch').mockResolvedValue(whitespaceYaml);
      jest.spyOn(yaml, 'parse').mockReturnValue(null);

      const result = await loader.load('whitespace.yaml');

      expect(result).toBeNull();
    });
  });

  describe('error message formatting', () => {
    it('should include file path in FileFetchError', async () => {
      const testPath = 'missing-file.yaml';
      jest.spyOn(loader, 'fetch').mockRejectedValue(new Error('ENOENT'));

      try {
        await loader.load(testPath);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(FileFetchError);
        expect((error as FileFetchError).message).toContain(testPath);
      }
    });

    it('should include file path in ParseError', async () => {
      const testPath = 'invalid.json';
      const invalidJson = '{invalid}';

      mockGetFileExtension.mockReturnValue('.json');
      jest.spyOn(loader, 'fetch').mockResolvedValue(invalidJson);

      try {
        await loader.load(testPath);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        expect((error as ParseError).message).toContain(testPath);
      }
    });

    it('should include file path in ParseError for unsupported file types', async () => {
      const testPath = 'unsupported.xyz';

      mockGetFileExtension.mockReturnValue('.xyz');
      jest.spyOn(loader, 'fetch').mockResolvedValue('content');

      try {
        await loader.load(testPath);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(UnsupportedFileTypeError);
        expect((error as UnsupportedFileTypeError).message).toContain(testPath);
        expect((error as UnsupportedFileTypeError).message).toContain(
          'Unsupported file type'
        );
      }
    });
  });
});
