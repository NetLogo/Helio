import fs from 'fs/promises';
import mustache from 'mustache';
import path from 'path';

import { BuildResult, PageResult } from 'api.schemas.js';
import { BuildVariable, BuildVariablesLoader } from './BuildVariablesLoader.js';
import {
  FileFetchError,
  InitializationError,
  ParseError,
  RenderError,
} from './errors.js';
import PageParser from './PageParser.js';
import { ProjectConfigLoader } from './ProjectConfigLoader.js';
import { PageConfig, ProjectConfig, ProjectConfigSchema } from './schemas.js';

/**
 * @class MustacheRenderer
 *
 * High-level interface for rendering mustache templates driven by
 * YAML front matter or equivalent JSON configuration.
 *
 */
class MustacheRenderer {
  private _buildVariablesLoader: BuildVariablesLoader;
  private _pageParser: PageParser;

  public paths: {
    projectRoot: string;
    scanRoot: string;
    outputRoot: string;
  };
  public defaultLanguage: string;

  constructor(private _config: ProjectConfig) {
    if (!this._config) {
      throw new InitializationError(
        'MustacheRenderer requires a project configuration.'
      );
    }

    if (!ProjectConfigSchema.safeParse(this._config).success) {
      throw new InitializationError(
        'Invalid project configuration provided to MustacheRenderer.'
      );
    }

    this.paths = {
      projectRoot: path.resolve(process.cwd(), this._config.projectRoot || '.'),
      scanRoot: path.resolve(process.cwd(), this._config.scanRoot || '.'),
      outputRoot: path.resolve(
        process.cwd(),
        this._config.outputRoot || 'dist'
      ),
    };

    this.defaultLanguage = this._config.defaults?.language || 'en';
    this._buildVariablesLoader = new BuildVariablesLoader(this.paths.scanRoot);
    this._pageParser = new PageParser(this, this._config);
  }

  static async fromConfigPath(configPath: string): Promise<MustacheRenderer> {
    const projectConfig = await ProjectConfigLoader.load(configPath);
    return new MustacheRenderer(projectConfig);
  }

  // Public API
  /**
   * Build all YAML files found in the scan root directory.
   * This method scans for YAML files recursively and processes each one.
   *
   * @returns A promise that resolves to a BuildResult containing all processed pages
   * @throws {InitializationError} If the renderer has not been initialized
   * @throws {FileFetchError} If YAML files cannot be read
   * @throws {ParseError} If YAML files cannot be parsed
   */
  async build(): Promise<BuildResult> {
    const startTime = new Date();
    const errors: string[] = [];
    const pages: Record<string, PageResult> = {};

    try {
      const yamlFiles = await this.findYamlFiles();

      for (const yamlPath of yamlFiles) {
        try {
          const pageResults = await this.buildSingle(yamlPath);
          for (const pageResult of pageResults) {
            pages[pageResult.sourcePath] = pageResult;
          }
        } catch (error: any) {
          errors.push(`Failed to build ${yamlPath}: ${error.message}`);
        }
      }

      const endTime = new Date();
      const successfulPages = Object.values(pages).filter(
        (p) => p.success
      ).length;
      const failedPages = Object.values(pages).filter((p) => !p.success).length;

      return {
        pages,
        totalPages: Object.keys(pages).length,
        successfulPages,
        failedPages,
        success: failedPages === 0,
        errors,
        stats: {
          buildTimeMs: endTime.getTime() - startTime.getTime(),
          startTime,
          endTime,
        },
      };
    } catch (error: any) {
      const endTime = new Date();
      errors.push(`Build failed: ${error.message}`);

      return {
        pages,
        totalPages: 0,
        successfulPages: 0,
        failedPages: 0,
        success: false,
        errors,
        stats: {
          buildTimeMs: endTime.getTime() - startTime.getTime(),
          startTime,
          endTime,
        },
      };
    }
  }

  /**
   * Build a single YAML file by its path.
   *
   * @param yamlPath - Absolute or scan-root-relative path to the YAML file
   * @returns A promise that resolves to a PageResult for the processed file
   * @throws {FileFetchError} If the YAML file cannot be read
   * @throws {ParseError} If the YAML file cannot be parsed
   * @throws {RenderError} If template rendering fails
   */
  async buildSingle(yamlPath: string): Promise<PageResult[]> {
    try {
      yamlPath = path.resolve(this.paths.scanRoot, yamlPath);
      return await this._pageParser.processYamlFile(yamlPath);
    } catch (error: any) {
      console.warn(`Error processing ${yamlPath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Build from a single configuration object without reading from disk.
   * This method allows programmatic generation of pages.
   *
   * @param config - Page configuration object
   * @param baseFileName - Base name for output files
   * @param content - Optional mustache template content. If not provided, will read from file system
   * @returns A promise that resolves to a PageResult
   * @throws {RenderError} If template rendering fails
   */
  async buildFromConfiguration(
    config: Array<Partial<PageConfig>>,
    baseFileName: string,
    content?: string
  ): Promise<PageResult[]> {
    try {
      // Process the single configuration using PageParser
      return await this._pageParser.processConfigurations(
        config,
        baseFileName,
        content
      );
    } catch (error: any) {
      return [];
    }
  }

  /**
   *
   * @param content - Mustache template content
   * @param variables - Variables to interpolate
   * @returns Rendered content
   *
   * @throws {RenderError} If rendering fails for any reason.
   */
  render(content: string, variables: Record<string, any>) {
    let rendered;
    try {
      rendered = mustache.render(content, variables);
      // Validate the rendered output
      if (!rendered) {
        throw new RenderError('Rendered output is empty');
      }
    } catch (error: any) {
      throw new RenderError(
        `Failed to render Mustache template`,
        error.message
      );
    }
    return rendered;
  }

  // Helper Public API
  getOutputFilePath(relativeBaseName: string, extension: string): string {
    const extensionNoDot = extension.replace(/^\./, '');
    return path.join(
      this.paths.outputRoot,
      relativeBaseName + '.' + extensionNoDot
    );
  }

  getMetadataFilePath(relativeBaseName: string): string {
    return path.join(
      this.paths.outputRoot,
      relativeBaseName + PageParser.METADATA_SUFFIX
    );
  }

  getSourceFilePath(relativeBaseName: string, extension: string): string {
    const extensionNoDot = extension.replace(/^\./, '');
    return path.join(
      this.paths.scanRoot,
      relativeBaseName + '.' + extensionNoDot
    );
  }

  // Private methods
  /**
   * Recursively find YAML files under the scanRoot directory.
   * @returns – A promise that resolves to an array of YAML file paths.
   *
   * @throws {InitializationError} If the renderer has not been initialized.
   */
  private async findYamlFiles() {
    const yamlFiles: string[] = [];

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const res = path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(res);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))
        ) {
          yamlFiles.push(res);
        }
      }
    }

    await walk(this.paths.scanRoot);
    return yamlFiles;
  }

  /**
   * Load a build variable from a file using the BuildVariablesLoader.
   * @param value - The build variable to load.
   * @returns A promise that resolves to the value of the build variable.
   *
   * @throws {InitializationError} If the renderer has not been initialized.
   *
   * From BuildVariablesLoader.ts:
   * @throws {FileFetchError} If the file cannot be fetched
   * @throws {ParseError} If the file cannot be parsed
   * @throws {UnsupportedFileTypeError} If the file type is not supported
   */
  async loadBuildVariable(value: string): Promise<BuildVariable> {
    return this._buildVariablesLoader.load(value);
  }
}

export default MustacheRenderer;
