import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';

import { PageResult } from 'api.schemas.js';
import { FileFetchError, ParseError } from './errors.js';
import MustacheRenderer from './Renderer.js';
import { PageConfig, ProjectConfig } from './schemas.js';
import { joinIgnoreNone } from './utils.js';

/**
 * @class PageParser
 *
 * Processes individual YAML files containing page configurations,
 * generating HTML files for each item based on the configuration.
 *
 * This class handles:
 * - Processing YAML file data
 * - Applying inheritance between configurations
 * - Loading build variables
 * - Generating file paths
 * - Rendering mustache templates to output files
 * - Writing output files
 */
class PageParser {
  private renderer: MustacheRenderer;
  private projectConfig: ProjectConfig;

  static readonly METADATA_SUFFIX = '.metadata.json';

  constructor(renderer: MustacheRenderer, projectConfig: ProjectConfig) {
    this.renderer = renderer;
    this.projectConfig = projectConfig;
  }

  /**
   * Process a single YAML file, generate HTML files for each item.
   * The processing sequence is as follows:
   *   1. Load the YAML file, which contains an array of page declarations,
   *      each potentially with inheritance and build variables.
   *      Not all items may have output enabled; they might be used for inheritance only.
   *   2. For each item:
   *        - Apply inheritance from other items as specified. (Can throw if invalid)
   *        - Prepare build variables, loading any external variables as needed.
   *        - Concat the loaded build variables with the front matter variables.
   *        - Determine the source file path based on the item configuration,
   *          including language and extension. Default language may not require a language suffix.
   *        - Determine the output file path based on the project config and item settings.
   *        - If the item has `output: true`, render the source to output and write the output file.
   *
   * The output files are written to the configured output directory.
   * The input files are expected to be in the scan root directory and have the
   * appropriate naming schema: <yaml-name>.<language>.<extension> or <yaml-name>.<extension>.
   *
   * @param yamlFilePath - Path to the YAML file to process
   * @returns A promise that resolves when processing is complete
   */
  async processYamlFile(
    yamlFilePath: string,
    sharedBuildVariables?: Record<string, unknown>
  ): Promise<PageResult[]> {
    const data = await this.loadYaml(yamlFilePath);
    const relativeBaseName = path
      .relative(this.getProjectScanRoot(), yamlFilePath) // Remove scan root
      .replace(/\.ya?ml$/i, ''); // Remove .yaml/.yml extension

    const results = await this.processPageConfigurations(
      data,
      relativeBaseName,
      undefined,
      sharedBuildVariables
    );
    return results;
  }

  /**
   * Process dynamically generated page configuration objects directly, bypassing YAML file loading.
   * This method allows you to programmatically generate page configurations and process them
   * without needing to create YAML files on disk.
   *
   * @param pageConfigs - Array of page configuration objects to process
   * @param baseFileName - Base name to use for output files (replaces YAML file path logic)
   * @param fileContent - Optional content to use instead of reading from files
   * @returns A promise that resolves when processing is complete
   *
   * @example
   * ```ts
   * const configs = [
   *   {
   *     title: 'Dynamic Page 1',
   *     description: 'Generated programmatically',
   *     language: 'en',
   *     output: true
   *   },
   *   {
   *     title: 'Dynamic Page 2',
   *     language: 'es',
   *     inheritFrom: [0],
   *     output: true
   *   }
   * ];
   *
   * await pageParser.processConfigurations(
   *   configs,
   *   'dynamic-pages',
   *   '# {{title}}\n\n{{description}}'
   * );
   * ```
   */
  async processConfigurations(
    pageConfigs: Array<Partial<PageConfig> | null | undefined>,
    baseFileName: string,
    fileContent?: string,
    sharedBuildVariables?: Record<string, unknown>
  ): Promise<PageResult[]> {
    const results = await this.processPageConfigurations(
      pageConfigs,
      baseFileName,
      fileContent,
      sharedBuildVariables
    );
    return results;
  }

  /**
   * Shared implementation for processing page configurations from any source.
   * @param data - Array of page configuration objects to process
   * @param relativeBaseName - Base name for file path generation
   * @param fileContent - Optional content to use instead of reading from files
   */
  private async processPageConfigurations(
    data: Array<Partial<PageConfig> | null | undefined>,
    relativeBaseName: string,
    fileContent?: string,
    sharedBuildVariables?: Record<string, unknown>
  ): Promise<PageResult[]> {
    let results: PageResult[] = [];
    const defaults = { language: 'en', ...this.projectConfig.defaults };
    const configs = [...data];

    for (let index = 0; index < configs.length; index++) {
      try {
        const mdConfig: PageConfig = this._applyCascadeInheritance(
          configs,
          defaults,
          index
        );

        const buildVars = await this._prepareBuildVariables(
          mdConfig,
          sharedBuildVariables
        );

        const language = this._getPageLanguage(mdConfig, defaults.language);
        const extension = mdConfig.extension || 'md';

        const sourceFileName = this._getSourceFileName(
          relativeBaseName,
          extension,
          language,
          defaults.language
        );

        const { outputPath, jsonOutputPath } = this._generateOutputPaths(
          relativeBaseName,
          extension,
          language,
          defaults.language
        );

        if (mdConfig.output) {
          await fs.mkdir(path.dirname(outputPath), { recursive: true });

          if (fileContent) {
            // Use provided content directly
            await this.generateOutputFileFromContent(
              fileContent,
              outputPath,
              buildVars
            );
          } else {
            // Read source from file system as usual
            await this.generateOutputFile(
              sourceFileName,
              outputPath,
              buildVars
            );
          }

          await this.generateMetadataJSON(
            sourceFileName,
            jsonOutputPath,
            mdConfig
          );
        }

        results.push({
          baseName: relativeBaseName,
          sourcePath: path.join(this.getProjectScanRoot(), sourceFileName),
          outputPath,
          language,
          title: mdConfig.title,
          description: mdConfig.description,
          success: true,
          metadataPath: jsonOutputPath,
        });
      } catch (err: any) {
        console.error(
          `Error processing item with base name ${relativeBaseName}:`,
          err
        );
        results.push({
          baseName: relativeBaseName,
          sourcePath: relativeBaseName,
          success: false,
          error: err.message || String(err),
        });
      }
    }

    return results;
  }

  /**
   * Generate output file from a mustache source.
   * @param sourceFileName - Name of the source mustache file
   * @param outputPath - Path where the file should be written
   * @param buildVars - Variables to use in template rendering
   */
  private async generateOutputFile(
    sourceFileName: string,
    outputPath: string,
    buildVars: Record<string, any>
  ): Promise<void> {
    // Read source mustache template
    const sourcePath = path.join(this.getProjectScanRoot(), sourceFileName);
    const templateContent = await fs.readFile(sourcePath, 'utf-8');

    await this.renderAndWriteOutput(templateContent, outputPath, buildVars);
  }

  /**
   * Generate a file from provided mustache content (no file system read).
   * @param fileContent - The mustache content to render
   * @param outputPath - Path where the file should be written
   * @param buildVars - Variables to use in template rendering
   */
  private async generateOutputFileFromContent(
    fileContent: string,
    outputPath: string,
    buildVars: Record<string, any>
  ): Promise<void> {
    await this.renderAndWriteOutput(fileContent, outputPath, buildVars);
  }

  /**
   * Render content to output and write to file (shared implementation).
   * @param fileContent - The mustache content to render
   * @param outputPath - Path where the output file should be written
   * @param buildVars - Variables to use in template rendering
   * @param logMessage - Message to log after successful write
   */
  private async renderAndWriteOutput(
    fileContent: string,
    outputPath: string,
    buildVars: Record<string, any>
  ): Promise<void> {
    // Render content to output
    const renderedOutput = this.renderer.render(fileContent, buildVars);

    // Write output file
    await fs.writeFile(outputPath, renderedOutput, 'utf-8');
  }

  /**
   * Generate a metadata JSON file alongside the output file.
   * @param sourceFileName - Name of the source markdown file
   * @param outputPath - Path where the JSON file should be written
   * @param mdConfig - The markdown page configuration
   */
  private async generateMetadataJSON(
    sourceFileName: string,
    jsonOutputPath: string,
    mdConfig: PageConfig
  ): Promise<void> {
    const metadata = {
      source: path.relative(
        this.getProjectRoot(),
        path.join(this.getProjectScanRoot(), sourceFileName)
      ),
      jsonOutputPath: path.relative(this.getProjectRoot(), jsonOutputPath),
      ...mdConfig,
    };

    await fs.writeFile(
      jsonOutputPath,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
  }

  // Helper methods
  private _applyCascadeInheritance(
    configs: Array<Partial<PageConfig> | null | undefined>,
    defaultConfiguration: Partial<PageConfig>,
    currentIndex: number
  ): PageConfig {
    if (currentIndex < 0 || currentIndex >= configs.length) {
      throw new Error(`Invalid currentIndex ${currentIndex} for inheritance`);
    }
    const currentConfig = configs[currentIndex]!;
    const baseConfig = { ...defaultConfiguration, ...currentConfig };

    if (Array.isArray(baseConfig.inheritFrom)) {
      for (const idx of baseConfig.inheritFrom) {
        if (idx < 0 || idx >= configs.length) {
          throw new Error(
            `Invalid inheritFrom index ${idx} in item at index ${currentIndex}`
          );
        }

        if (idx > currentIndex) {
          throw new Error(
            `Invalid inheritFrom index ${idx} must be less than or equal to the current item index ${currentIndex} to apply inheritance correctly`
          );
        }

        Object.assign(baseConfig, configs[idx] || {});
      }
    }

    Object.assign(baseConfig, currentConfig || {});
    configs[currentIndex] = baseConfig;

    return baseConfig as PageConfig;
  }

  private async _prepareBuildVariables(
    mdConfig: PageConfig,
    sharedBuildVariables?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const buildVars: Record<string, unknown> = {
      ...mdConfig,
      ...(sharedBuildVariables || {}),
    };
    if (mdConfig.buildVariables) {
      for (const [key, val] of Object.entries(mdConfig.buildVariables)) {
        buildVars[key] = await this.renderer.loadBuildVariable(val as string);
      }
    }
    return buildVars;
  }

  private _getPageLanguage(
    mdConfig: PageConfig,
    defaultLanguage: string
  ): string {
    return mdConfig.language || defaultLanguage;
  }

  private _getSourceFileName(
    relativeBaseName: string,
    extension: string,
    language: string,
    defaultLanguage: string
  ) {
    const extensionNoDot = extension.replace(/^\./, '');
    return joinIgnoreNone(
      // Join + Filter
      [
        relativeBaseName, // <base-name>
        language === defaultLanguage ? null : language, // <language> if not default
        extensionNoDot, // <extension>
      ],
      '.' // = <base-name>.<language>.<extension> or <base-name>
    );
  }

  private _generateOutputPaths(
    relativeBaseName: string,
    extension: string,
    language: string,
    defaultLanguage: string
  ) {
    const extensionNoDot = extension.replace(/^\./, '');
    const distDir = this.projectConfig.outputRoot || 'dist';
    const distDirWithLang =
      language === defaultLanguage || !language
        ? distDir
        : path.join(distDir, language);
    const outputPath = path.join(
      this.getProjectRoot(),
      distDirWithLang,
      relativeBaseName + '.' + extensionNoDot
    );
    const jsonOutputPath = outputPath.replace(
      new RegExp(`\\.${extensionNoDot}$`),
      PageParser.METADATA_SUFFIX
    );

    return {
      outputPath,
      jsonOutputPath,
    };
  }

  /**
   * Load all documents from a YAML file.
   * @param filePath - Path to the YAML file.
   * @returns A promise that resolves to an array of document objects.
   *
   * @throws {InitializationError} If the renderer has not been initialized.
   * @throws {ParseError} If the YAML file cannot be parsed.
   * @throws {FileFetchError} If the file cannot be read.
   */
  private async loadYaml(filePath: string) {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      throw new FileFetchError(filePath, err);
    }

    let docs;
    try {
      docs = yaml.parseAllDocuments(content);
    } catch (err) {
      throw new ParseError(filePath, err);
    }

    return docs.map((doc) => doc.toJSON() || {}) || [];
  }

  /**
   * Get the project root directory.
   * @returns The project root path
   */
  private getProjectRoot(): string {
    return this.renderer.paths.projectRoot;
  }

  /**
   * Get the scan root directory.
   * @returns The scan root path
   */
  private getProjectScanRoot(): string {
    return this.renderer.paths.scanRoot;
  }
}

export default PageParser;
export type { PageConfig };
