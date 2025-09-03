// FileNotFoundError
export class FileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}

// FileFetchError
export class FileFetchError extends Error {
  constructor(filePath: string, message: unknown) {
    super(`Failed to fetch file ${JSON.stringify(filePath)}: ${message}`);
  }
}

// FileLoadError
export class FileLoadError extends Error {
  constructor(filePath: string, message: unknown) {
    super(`Failed to load file ${filePath}: ${message}`);
  }
}

// ParseError
export class ParseError extends Error {
  constructor(filePath: string, message: unknown) {
    super(`Failed to parse file ${filePath}: ${message}`);
    this.name = 'ParseError';
  }
}

export class JSONParseError extends ParseError {
  constructor(filePath: string, message: unknown) {
    super(filePath, `Invalid JSON format: ${message}`);
    this.name = 'JSONParseError';
  }
}

// UnsupportedFileTypeError
export class UnsupportedFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported file type: ${filePath}`);
    this.name = 'UnsupportedFileTypeError';
  }
}

// ValidationError
export class ValidationError extends Error {
  constructor(message: string) {
    super(`Validation error: ${message}`);
    this.name = 'ValidationError';
  }
}

// InitializationError
export class InitializationError extends Error {
  constructor(message: string) {
    super(`Initialization error: ${message}`);
    this.name = 'InitializationError';
  }
}

// RenderError
export class RenderError extends Error {
  constructor(message: string, error?: string) {
    super(`Render error: ${message}\n${error ? `Caused by: ${error}` : ''}`);
    this.name = 'RenderError';
  }
}
