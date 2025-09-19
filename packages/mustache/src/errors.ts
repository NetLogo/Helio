// FileNotFoundError
export class FileNotFoundError extends Error {
  public constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}

// FileFetchError
export class FileFetchError extends Error {
  public constructor(filePath: string, message: unknown) {
    super(`Failed to fetch file ${JSON.stringify(filePath)}: ${message}`);
  }
}

// FileLoadError
export class FileLoadError extends Error {
  public constructor(filePath: string, message: unknown) {
    super(`Failed to load file ${filePath}: ${message}`);
  }
}

// ParseError
export class ParseError extends Error {
  public constructor(filePath: string, message: unknown) {
    super(`Failed to parse file ${filePath}: ${message}`);
    this.name = 'ParseError';
  }
}

export class JSONParseError extends ParseError {
  public constructor(filePath: string, message: unknown) {
    super(filePath, `Invalid JSON format: ${message}`);
    this.name = 'JSONParseError';
  }
}

// UnsupportedFileTypeError
export class UnsupportedFileTypeError extends Error {
  public constructor(filePath: string) {
    super(`Unsupported file type: ${filePath}`);
    this.name = 'UnsupportedFileTypeError';
  }
}

// ValidationError
export class ValidationError extends Error {
  public constructor(message: string) {
    super(`Validation error: ${message}`);
    this.name = 'ValidationError';
  }
}

// InitializationError
export class InitializationError extends Error {
  public constructor(message: string) {
    super(`Initialization error: ${message}`);
    this.name = 'InitializationError';
  }
}

// RenderError
export class RenderError extends Error {
  public constructor(message: string, error?: string) {
    super(`Render error: ${message}\n${error ?? ''}`);
    this.name = 'RenderError';
  }
}

// NotSupportedError
export class NotSupportedError extends Error {
  public constructor(feature: string) {
    super(`Not supported: ${feature}`);
    this.name = 'NotSupportedError';
  }
}
