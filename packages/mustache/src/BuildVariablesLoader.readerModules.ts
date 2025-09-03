import { XMLParser } from 'fast-xml-parser';
import ini from 'ini';
import yaml from 'yaml';

import { execSync } from 'child_process';
import path from 'path';

import { BuildVariable, BuildVariablesLoader } from './BuildVariablesLoader';
import { FileFetchError, ParseError, UnsupportedFileTypeError } from './errors';
import { getFileExtension } from './utils';

/**
 * @typedef BuildVariableReader
 * @description Interface for language modules that can load build variables.
 */
export interface BuildVariableReader {
  get supportedExtensions(): string[];
  read(loader: BuildVariablesLoader, loadKey: string): Promise<BuildVariable>;
}

export class NodeStdoutReader implements BuildVariableReader {
  supportedExtensions = ['.js', '.mjs'];

  async read(
    loader: BuildVariablesLoader,
    filepath: string
  ): Promise<BuildVariable> {
    /**
     * Using this engine in a Next.js context forces us to call node on the
     * script and capture its STDOUT directly rather than being able to import
     * it. This limits the benefit of this dynamic reader but it still allows us
     * to create derived values, which was the goal of adding this in the first place.
     *
     * - Omar I, Sep 3 2025
     */
    const fullPath = loader.getFullFilePath(filepath);
    const scriptDirectory = path.dirname(fullPath);
    const scriptName = path.basename(fullPath);

    const command = [`cd ${scriptDirectory}`, `node ${scriptName}`].join(
      ' && '
    );
    const stdout = execSync(command, {
      encoding: 'utf-8',
    });
    if (!stdout) {
      throw new ParseError(
        fullPath,
        'Script did not return any output to stdout'
      );
    }

    try {
      return JSON.parse(stdout);
    } catch (error) {
      throw new ParseError(fullPath, (error as Error).message);
    }
  }
}

export class DataFileReader implements BuildVariableReader {
  static readonly xmlParser = new XMLParser();

  supportedExtensions = ['.yml', '.yaml', '.ini', '.xml', '.nlogox', '.json'];

  async read(
    loader: BuildVariablesLoader,
    value: string
  ): Promise<BuildVariable> {
    let source;
    try {
      source = await loader.fetch(value);
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
        return DataFileReader.xmlParser.parse(source);
      } else {
        throw new UnsupportedFileTypeError(value);
      }
    } catch (error: any) {
      throw new ParseError(value, error.message);
    }
  }
}
