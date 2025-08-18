import fs from 'fs/promises';
import { JSONParseError, ParseError, ValidationError } from './errors.js';
import { ProjectConfig, ProjectConfigSchema } from './schemas.js';

/**
 * @class ProjectConfigLoader
 *
 * Responsible for loading and validating the root configuration file (e.g., `conf.json`).
 *
 * Developers use this file to define global defaults and root paths for builds. This loader ensures
 * the config is both readable and schema-valid before usage elsewhere in the system.
 *
 * @example
 * ```ts
 * const config = await ConfigLoader.load('conf.json');
 * console.log(config.projectRoot); // -> './articles'
 * ```
 *
 * @summary Load and validate the engine config file.
 * @description Parses a JSON config file, validates its structure using `zod`, and returns a strongly typed object.
 *
 * @throws {ParseError} If the file is unreadable or not valid JSON.
 * @throws {ValidationError} If the config file does not conform to the expected schema.
 *
 * @see {@link https://github.com/colinhacks/zod} for schema validation
 * @see {@link https://nodejs.org/api/fs.html#fspromisesreadfilepath-options} for file loading
 */
export class ProjectConfigLoader {
  /**
   * Loads and validates a config file from the given path.
   * @param configPath - Path to the config file (typically `conf.json`)
   * @returns Parsed and validated Config object
   */
  static async load(configPath: string): Promise<ProjectConfig> {
    let raw: string;
    try {
      raw = await fs.readFile(configPath, 'utf-8');
    } catch (err) {
      throw new ParseError(configPath, err);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new JSONParseError(configPath, err);
    }

    const result = ProjectConfigSchema.safeParse(parsed);
    if (!result.success) {
      throw new ValidationError(
        `Invalid config format:\n${JSON.stringify(result.error.format(), null, 2)}`
      );
    }

    return ProjectConfigSchema.parse(parsed);
  }
}
