import fs from 'fs/promises';
import path from 'path';
import { MarkdownPageConfig, MarkdownProjectConfig } from '../src/schemas.js';

/**
 * Test utilities for creating mock data and setting up test environments
 */

export const createMockProjectConfig = (
  overrides: Partial<MarkdownProjectConfig> = {}
): MarkdownProjectConfig => ({
  projectRoot: './test-project',
  scanRoot: './test-source',
  outputRoot: './test-output',
  defaults: {
    language: 'en',
    extension: '.md',
    output: true,
    title: 'Test Document',
    description: 'A test document',
  },
  ...overrides,
});

export const createMockPageConfig = (
  overrides: Partial<MarkdownPageConfig> = {}
): MarkdownPageConfig => ({
  language: 'en',
  extension: '.md',
  output: true,
  title: 'Test Page',
  description: 'A test page',
  keywords: ['test', 'markdown'],
  tags: ['testing'],
  ...overrides,
});

export const createMockYamlConfig = (
  items: Partial<MarkdownPageConfig>[] = []
): Partial<MarkdownPageConfig>[] => {
  if (items.length === 0) {
    return [createMockPageConfig()];
  }
  return items.map((item) => createMockPageConfig(item));
};

export const createMockMarkdownContent = (
  variables: Record<string, string> = {}
): string => {
  const defaultContent = `# {{title}}

{{description}}

## Features

- Feature 1
- Feature 2

## Variables

{{#variables}}
- {{name}}: {{value}}
{{/variables}}`;

  // Simple variable replacement for testing
  let content = defaultContent;
  Object.entries(variables).forEach(([key, value]) => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return content;
};

export const createTempDirectory = async (): Promise<string> => {
  const tempDir = path.join(process.cwd(), 'temp-test-' + Date.now());
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
};

export const cleanupTempDirectory = async (tempDir: string): Promise<void> => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
};

export const createMockFileSystem = () => {
  const mockFiles: Record<string, string> = {};

  const mockFs = {
    readFile: jest.fn().mockImplementation(async (filePath: string) => {
      const normalizedPath = path.normalize(filePath);
      if (normalizedPath in mockFiles) {
        return mockFiles[normalizedPath];
      }
      throw new Error(`File not found: ${filePath}`);
    }),

    writeFile: jest
      .fn()
      .mockImplementation(async (filePath: string, content: string) => {
        const normalizedPath = path.normalize(filePath);
        mockFiles[normalizedPath] = content;
      }),

    mkdir: jest.fn().mockResolvedValue(undefined),

    readdir: jest.fn().mockImplementation(async (dirPath: string) => {
      const normalizedDir = path.normalize(dirPath);
      return Object.keys(mockFiles)
        .filter((filePath) => filePath.startsWith(normalizedDir))
        .map((filePath) => path.relative(normalizedDir, filePath))
        .filter((relativePath) => !relativePath.includes('/'));
    }),

    addFile: (filePath: string, content: string) => {
      mockFiles[path.normalize(filePath)] = content;
    },

    getFile: (filePath: string) => {
      return mockFiles[path.normalize(filePath)];
    },

    reset: () => {
      Object.keys(mockFiles).forEach((key) => delete mockFiles[key]);
      jest.clearAllMocks();
    },
  };

  return mockFs;
};

export const mockConsole = () => {
  const originalConsole = { ...console };
  const logs: Array<string> = [];
  const errors: Array<string> = [];
  const warnings: Array<string> = [];

  beforeEach(() => {
    logs.length = 0;
    errors.length = 0;
    warnings.length = 0;

    console.log = jest.fn((...args) => logs.push(args.join(' ')));
    console.error = jest.fn((...args) => errors.push(args.join(' ')));
    console.warn = jest.fn((...args) => warnings.push(args.join(' ')));
    console.info = jest.fn((...args) => logs.push(args.join(' ')));
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
  });

  return { logs, errors, warnings };
};
