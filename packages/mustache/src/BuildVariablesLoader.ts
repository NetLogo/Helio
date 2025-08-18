import ini from 'ini';
import path from 'path';
import yaml from 'yaml';

import { XMLParser } from 'fast-xml-parser';
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
 * Supported file types:
 * - YAML (.yaml, .yml)
 * - JSON (.json)
 * - INI (.ini)
 * - XML (.xml, .nlogox)
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
  static readonly supportedExtensions = [
    '.yaml',
    '.yml',
    '.json',
    '.ini',
    '.xml',
    '.nlogox',
  ];
  static readonly xmlParser = new XMLParser();

  constructor(private scanRoot: string) {}

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

  /**
   * Loads and parses build variables from a given path or URL.
   * @param value - Path or URL to load the build variables from
   * @returns Parsed build variables as an object or array
   * @throws {FileFetchError} If the file cannot be fetched
   * @throws {ParseError} If the file cannot be parsed
   * @throws {UnsupportedFileTypeError} If the file type is not supported
   */
  async load(value: string): Promise<BuildVariable> {
    let source;
    try {
      source = await this.fetch(value);
    } catch (error: any) {
      throw new FileFetchError(value, error.message);
    }

    const extension = getFileExtension(value).toLowerCase();

    try {
      if (extension === '.yaml' || extension === '.yml') {
        return yaml.parse(source);
      } else if (extension === '.json') {
        return JSON.parse(source);
      } else if (extension === '.ini') {
        return ini.parse(source);
      } else if (extension === '.xml' || extension === '.nlogox') {
        return BuildVariablesLoader.xmlParser.parse(source);
      } else {
        throw new UnsupportedFileTypeError(value);
      }
    } catch (error: any) {
      throw new ParseError(value, error.message);
    }
  }

  /**
   * Returns a list of supported file types for build variables.
   *
   * @readonly
   * @type {string}
   */
  get supportedFileTypes() {
    return BuildVariablesLoader.supportedExtensions.join(', ');
  }
}

/**
 * @typedef BuildVariable
 * @description Represents the build variables loaded from a file.
 *             It can be either a dictionary (object) or a list (array).
 */
export type BuildVariable = Record<string, unknown> | Array<unknown>;
