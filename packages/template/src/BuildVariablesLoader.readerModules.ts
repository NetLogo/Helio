import { XMLParser } from "fast-xml-parser";
import ini from "ini";
import yaml from "yaml";

import type { BuildVariable, BuildVariablesLoader } from "./BuildVariablesLoader.js";
import { FileFetchError, ParseError, UnsupportedFileTypeError } from "./errors.js";
import { getFileExtension } from "./utils.js";

/**
 * @typedef BuildVariableReader
 * @description Interface for language modules that can load build variables.
 */
export type BuildVariableReader = {
  get supportedExtensions(): Array<string>;
  read: (loader: BuildVariablesLoader, loadKey: string) => Promise<BuildVariable>;
};

export class DataFileReader implements BuildVariableReader {
  public static readonly xmlParser = new XMLParser();
  public supportedExtensions = [".yml", ".yaml", ".ini", ".xml", ".nlogox", ".json"];

  public async read(loader: BuildVariablesLoader, value: string): Promise<BuildVariable> {
    let source = "";
    try {
      source = await loader.fetch(value);
    } catch (error: unknown) {
      throw new FileFetchError(value, (error as Error).message);
    }

    const extension = getFileExtension(value).toLowerCase();

    try {
      if (extension === ".yaml" || extension === ".yml") {
        return yaml.parse(source) as BuildVariable;
      } else if (extension === ".json") {
        return JSON.parse(source) as BuildVariable;
      } else if (extension === ".ini") {
        return ini.parse(source) as BuildVariable;
      } else if (extension === ".xml" || extension === ".nlogox") {
        return DataFileReader.xmlParser.parse(source) as BuildVariable;
      } else {
        throw new UnsupportedFileTypeError(value);
      }
    } catch (error: unknown) {
      throw new ParseError(value, (error as Error).message);
    }
  }
}
