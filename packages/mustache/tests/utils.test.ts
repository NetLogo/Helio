import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';
import fs from 'fs/promises';
import {
  getFileExtension,
  isURL,
  joinIgnoreNone,
  readLocal,
  readRemote,
} from '../src/utils.js';

// Mock dependencies
jest.mock('axios');
jest.mock('fs/promises');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('joinIgnoreNone', () => {
    it('should join strings with default separator', () => {
      const result = joinIgnoreNone(['part1', 'part2', 'part3']);
      expect(result).toBe('part1.part2.part3');
    });

    it('should join strings with custom separator', () => {
      const result = joinIgnoreNone(['part1', 'part2', 'part3'], '/');
      expect(result).toBe('part1/part2/part3');
    });

    it('should ignore null values', () => {
      const result = joinIgnoreNone(['part1', null, 'part3']);
      expect(result).toBe('part1.part3');
    });

    it('should ignore undefined values', () => {
      const result = joinIgnoreNone(['part1', undefined, 'part3']);
      expect(result).toBe('part1.part3');
    });

    it('should ignore empty strings', () => {
      const result = joinIgnoreNone(['part1', '', 'part3']);
      expect(result).toBe('part1.part3');
    });

    it('should handle all falsy values', () => {
      const result = joinIgnoreNone([null, undefined, '', 'part4']);
      expect(result).toBe('part4');
    });

    it('should return empty string for all falsy values', () => {
      const result = joinIgnoreNone([null, undefined, '']);
      expect(result).toBe('');
    });

    it('should handle empty array', () => {
      const result = joinIgnoreNone([]);
      expect(result).toBe('');
    });

    it('should preserve zero values', () => {
      const result = joinIgnoreNone(['part1', '0', 'part3']);
      expect(result).toBe('part1.0.part3');
    });

    it('should handle mixed types correctly', () => {
      const result = joinIgnoreNone(
        ['start', null, 'middle', undefined, '', 'end'],
        '-'
      );
      expect(result).toBe('start-middle-end');
    });
  });

  describe('isURL', () => {
    it('should return true for http URLs', () => {
      expect(isURL('http://example.com')).toBe(true);
      expect(isURL('http://example.com/path')).toBe(true);
      expect(isURL('http://subdomain.example.com')).toBe(true);
    });

    it('should return true for https URLs', () => {
      expect(isURL('https://example.com')).toBe(true);
      expect(isURL('https://example.com/path')).toBe(true);
      expect(isURL('https://subdomain.example.com')).toBe(true);
    });

    it('should return true for URLs with different cases', () => {
      expect(isURL('HTTP://example.com')).toBe(true);
      expect(isURL('HTTPS://example.com')).toBe(true);
      expect(isURL('Http://example.com')).toBe(true);
      expect(isURL('Https://example.com')).toBe(true);
    });

    it('should return false for non-URLs', () => {
      expect(isURL('example.com')).toBe(false);
      expect(isURL('www.example.com')).toBe(false);
      expect(isURL('ftp://example.com')).toBe(false);
      expect(isURL('file:///path/to/file')).toBe(false);
      expect(isURL('./relative/path')).toBe(false);
      expect(isURL('/absolute/path')).toBe(false);
      expect(isURL('path/to/file.txt')).toBe(false);
    });

    it('should return false for empty or invalid strings', () => {
      expect(isURL('')).toBe(false);
      expect(isURL('   ')).toBe(false);
      expect(isURL('not-a-url')).toBe(false);
    });

    it('should handle URLs with query parameters and fragments', () => {
      expect(isURL('https://example.com/path?query=value')).toBe(true);
      expect(isURL('https://example.com/path#fragment')).toBe(true);
      expect(isURL('https://example.com/path?query=value#fragment')).toBe(true);
    });
  });

  describe('readRemote', () => {
    it('should fetch data from remote URL', async () => {
      const mockData = 'remote file content';
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await readRemote('https://example.com/file.txt');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/file.txt'
      );
      expect(result).toBe(mockData);
    });

    it('should handle axios response with different data types', async () => {
      const mockData = { content: 'json content' };
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await readRemote('https://example.com/data.json');

      expect(result).toEqual(mockData);
    });

    it('should propagate axios errors', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValue(error);

      await expect(readRemote('https://example.com/file.txt')).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle axios with status and headers', async () => {
      const mockData = 'content';
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const result = await readRemote('https://example.com/file.txt');
      expect(result).toBe(mockData);
    });
  });

  describe('readLocal', () => {
    it('should read local file content', async () => {
      const mockContent = 'local file content';
      mockedFs.readFile.mockResolvedValue(mockContent);

      const result = await readLocal('/path/to/file.txt');

      expect(mockedFs.readFile).toHaveBeenCalledWith(
        '/path/to/file.txt',
        'utf-8'
      );
      expect(result).toBe(mockContent);
    });

    it('should propagate file system errors', async () => {
      const error = new Error('File not found');
      mockedFs.readFile.mockRejectedValue(error);

      await expect(readLocal('/nonexistent/file.txt')).rejects.toThrow(
        'File not found'
      );
    });

    it('should handle different file paths', async () => {
      const mockContent = 'content';
      mockedFs.readFile.mockResolvedValue(mockContent);

      await readLocal('./relative/path.txt');
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        './relative/path.txt',
        'utf-8'
      );

      await readLocal('/absolute/path.txt');
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        '/absolute/path.txt',
        'utf-8'
      );
    });
  });

  describe('getFileExtension', () => {
    it('should extract extensions from simple file names', () => {
      expect(getFileExtension('file.txt')).toBe('.txt');
      expect(getFileExtension('document.pdf')).toBe('.pdf');
      expect(getFileExtension('script.js')).toBe('.js');
      expect(getFileExtension('style.css')).toBe('.css');
    });

    it('should extract extensions from full file paths', () => {
      expect(getFileExtension('/path/to/file.txt')).toBe('.txt');
      expect(getFileExtension('./relative/path/document.pdf')).toBe('.pdf');
      expect(getFileExtension('C:\\Windows\\file.exe')).toBe('.exe');
    });

    it('should extract extensions from URLs', () => {
      expect(getFileExtension('https://example.com/file.txt')).toBe('.txt');
      expect(getFileExtension('http://domain.com/path/to/document.pdf')).toBe(
        '.pdf'
      );
    });

    it('should handle URLs with query parameters', () => {
      expect(getFileExtension('https://example.com/file.txt?version=1')).toBe(
        '.txt'
      );
      expect(
        getFileExtension('https://example.com/doc.pdf?download=true&user=123')
      ).toBe('.pdf');
    });

    it('should handle URLs with fragments', () => {
      expect(getFileExtension('https://example.com/file.txt#section1')).toBe(
        ''
      );
      expect(getFileExtension('https://example.com/doc.pdf#page=5')).toBe('');
    });

    it('should handle URLs with query parameters and fragments', () => {
      expect(getFileExtension('https://example.com/file.txt?v=1#top')).toBe(
        '.txt'
      );
      expect(
        getFileExtension('https://example.com/doc.pdf?download=true#page=1')
      ).toBe('.pdf');
    });

    it('should return empty string for files without extensions', () => {
      expect(getFileExtension('filename')).toBe('');
      expect(getFileExtension('/path/to/filename')).toBe('');
      expect(getFileExtension('https://example.com/path')).toBe('');
    });

    it('should handle multiple dots in filename', () => {
      expect(getFileExtension('file.backup.txt')).toBe('.txt');
      expect(getFileExtension('archive.tar.gz')).toBe('.gz');
      expect(getFileExtension('config.local.json')).toBe('.json');
    });

    it('should handle edge cases', () => {
      expect(getFileExtension('')).toBe('');
      expect(getFileExtension('.')).toBe('');
      expect(getFileExtension('.hidden')).toBe('.hidden');
      expect(getFileExtension('file.')).toBe('');
    });

    it('should handle complex extensions', () => {
      expect(getFileExtension('file.HTML')).toBe('.HTML');
      expect(getFileExtension('file.JSON')).toBe('.JSON');
      expect(getFileExtension('document.XML')).toBe('.XML');
    });

    it('should handle numeric extensions', () => {
      expect(getFileExtension('backup.001')).toBe('.001');
      expect(getFileExtension('file.v2')).toBe('.v2');
    });
  });

  describe('integration tests', () => {
    it('should work together for URL processing', () => {
      const url = 'https://example.com/path/file.json?v=1';

      expect(isURL(url)).toBe(true);
      expect(getFileExtension(url)).toBe('.json');
    });

    it('should work together for file path processing', () => {
      const path = './config/settings.yaml';

      expect(isURL(path)).toBe(false);
      expect(getFileExtension(path)).toBe('.yaml');
    });

    it('should handle path building with joinIgnoreNone', () => {
      const parts = ['base', null, 'middle', undefined, 'file.txt'];
      const path = joinIgnoreNone(parts, '/');

      expect(path).toBe('base/middle/file.txt');
      expect(getFileExtension(path)).toBe('.txt');
    });
  });
});
