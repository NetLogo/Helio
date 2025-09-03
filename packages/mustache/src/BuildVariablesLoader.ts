import path from 'path';

import {
  BuildVariableReader,
  DataFileReader,
  NodeStdoutReader,
} from './BuildVariablesLoader.readerModules.js';
import {
  FileFetchError,
  ParseError,
  UnsupportedFileTypeError,
} from './errors.js';
import { getFileExtension, isURL, readLocal, readRemote } from './utils.js';

/**
 * @class BuildVariablesLoader
 *
 * Class to load build variables from various file formats (YAML, JSON, INI, XML).
 * In our engine, we allow developers to specify build variables in the YAML
 * front matter, but also to load them from external files without having to dive into
 * the code. This class supports loading from local files or remote URLs.
 * It also supports dynamic loading of JavaScript files, long as the module
 * default export is a valid BuildVariable.
 *
 * Where would you see this? In some MyArticle.yaml file:
 * ```yaml
 * title: My Article
 * buildVariables:
 *  - <var_name>: <var_value>
 *  - dictionary: https://example.com/dictionary.yaml
 *  - myNetLogoModel: models/MyModel.nlogox
 * ```
 *
 * @example
 * ```ts
 * const loader = new BuildVariablesLoader('/path/to/project/root');
 * const vars = await loader.load('config/build-variables.yaml');
 * console.log(vars);
 * ```
 *
 * @summary Load build variables from various file formats.
 * @description This class provides methods to load build variables from local files or remote URLs
 *             in supported formats (YAML, JSON, INI, XML). It handles fetching, parsing, and error reporting.
 * @throws {FileFetchError} If the file cannot be fetched (network error, file not found, etc.)
 * @throws {ParseError} If the file cannot be parsed (invalid format, syntax error, etc.)
 * @throws {UnsupportedFileTypeError} If the file type is not supported
 *
 * @see {@link https://www.npmjs.com/package/yaml} for YAML parsing
 * @see {@link https://www.npmjs.com/package/ini} for INI
 * @see {@link https://www.npmjs.com/package/fast-xml-parser} for XML parsing
 * @see {@link https://www.npmjs.com/package/axios} for remote fetching
 * @see {@link https://nodejs.org/api/fs.html#fs_fs_promises_api} for local file reading
 */
export class BuildVariablesLoader {
  static readonly readers: BuildVariableReader[] = [
    new NodeStdoutReader(),
    new DataFileReader(),
  ];

  extensionMap = new Map<string, BuildVariableReader>();
  constructor(private scanRoot: string) {
    for (const loader of BuildVariablesLoader.readers) {
      for (const ext of loader.supportedExtensions) {
        this.extensionMap.set(ext, loader);
      }
    }
  }

  /**
   * Returns the full file path for a given value (local path or URL).
   * @param value - The input value (local path or URL)
   * @returns The full file path as a string
   */
  getFullFilePath(value: string): string {
    if (isURL(value)) {
      return value;
    } else {
      return path.join(this.scanRoot, value);
    }
  }

  /**
   * Fetches the content of a file from a local path or a remote URL.
   * @param value - Path or URL to fetch the build variables from
   * @returns The raw content of the file as a string
   */
  async fetch(value: string): Promise<string> {
    if (isURL(value)) {
      return readRemote(value);
    } else {
      const fullPath = path.join(this.scanRoot, value);
      return readLocal(fullPath);
    }
  }

  async load(value: string): Promise<BuildVariable> {
    const extension = getFileExtension(value).toLowerCase();
    const reader = this.extensionMap.get(extension);
    if (reader) {
      return reader.read(this, value);
    } else {
      throw new UnsupportedFileTypeError(`${extension} for ${value}`);
    }
  }

  /**
   * Returns a list of supported file types for build variables.
   *
   * @readonly
   * @type {string}
   */
  get supportedFileTypes() {
    return BuildVariablesLoader.readers
      .flatMap((reader) => reader.supportedExtensions)
      .join(', ');
  }
}

/**
 * @typedef BuildVariable
 * @description Represents the build variables loaded from a file.
 *             It can be either a dictionary (object) or a list (array).
 */
export type BuildVariable = Record<string, unknown> | Array<unknown>;
