import fs from "fs/promises";
import path from "path";
import yaml from "yaml";

import type { PageResult } from "./api.schemas.js";
import type { BuildVariablesLoader } from "./BuildVariablesLoader.js";
import type { TemplateEngine } from "./engines.js";
import { FileFetchError, ParseError } from "./errors.js";
import { MetadataGenerator } from "./MetadataGenerator.js";
import type { PageConfig, ProjectConfig } from "./schemas.js";
import { fsWriteFileDedupe, joinIgnoreNone } from "./utils.js";

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
  private scannedForPartials?: boolean = false;
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  public static readonly METADATA_SUFFIX = ".metadata.json";
  private readonly metadataGenerator: MetadataGenerator;

  public constructor(
    private readonly engine: TemplateEngine,
    private readonly buildVariablesLoader: BuildVariablesLoader,
    private readonly projectConfig: ProjectConfig,
    private readonly paths: { scanRoot: string; projectRoot: string; outputRoot: string },
  ) {
    this.metadataGenerator = new MetadataGenerator(projectConfig);
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
  public async processYamlFile(
    yamlFilePath: string,
    sharedBuildVariables?: Record<string, unknown>,
  ): Promise<Array<PageResult>> {
    const data = await this.loadYaml(yamlFilePath);
    const relativeBaseName = path
      .relative(this.getProjectScanRoot(), yamlFilePath) // Remove scan root
      .replace(/\.ya?ml$/i, ""); // Remove .yaml/.yml extension

    const results = await this.processPageConfigurations(
      data,
      relativeBaseName,
      undefined,
      sharedBuildVariables,
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
  public async processConfigurations(
    pageConfigs: Array<Partial<PageConfig> | null | undefined>,
    baseFileName: string,
    fileContent?: string,
    sharedBuildVariables?: Record<string, unknown>,
  ): Promise<Array<PageResult>> {
    const results = await this.processPageConfigurations(
      pageConfigs,
      baseFileName,
      fileContent,
      sharedBuildVariables,
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
    sharedBuildVariables?: Record<string, unknown>,
  ): Promise<Array<PageResult>> {
    await this._loadPartialsIfNeeded();

    const results: Array<PageResult> = [];
    const defaults = { language: "en", ...this.projectConfig.defaults };
    const configs = [...data];

    for (let index = 0; index < configs.length; index++) {
      try {
        const mdConfig = this._applyCascadeInheritance(configs, defaults, index);
        const buildVars = await this._prepareBuildVariables(mdConfig, sharedBuildVariables);
        const language = this._getPageLanguage(mdConfig, defaults.language);
        const extension = mdConfig.extension || "md";

        const outputField = mdConfig.output;
        const shouldOutput = this._shouldOutput(outputField);
        if (shouldOutput) {
          const sourceFileName = this._getSourceFileName(
            relativeBaseName,
            extension,
            language,
            defaults.language,
          );

          const relOutputBasename = this._getRelativeBaseName(relativeBaseName, outputField);
          const localeRelName = this.projectConfig.locale.toSlug({
            language,
            defaultLanguage: defaults.language,
            slug: relOutputBasename,
            pageConfig: mdConfig,
          });

          const outputPath = this._generateOutputPath(localeRelName, extension);
          const metadataOutputPath = this.metadataGenerator.generateMetadataOutputPath(outputPath);

          await fs.mkdir(path.dirname(outputPath), { recursive: true });

          let outputContent: string = "";
          if (typeof fileContent === "string") {
            outputContent = await this.generateOutputContent(fileContent, buildVars);
          } else {
            outputContent = await this.generateOutputContentFromFile(sourceFileName, buildVars);
          }

          const metadata = this.metadataGenerator.createMetadata(
            path.relative(
              this.getProjectRoot(),
              path.join(this.getProjectScanRoot(), sourceFileName),
            ),
            path.relative(this.getProjectRoot(), metadataOutputPath),
            mdConfig,
          );

          if (this.metadataGenerator.shouldPrependMetadata()) {
            outputContent = this.metadataGenerator.prependMetadata(outputContent, metadata);
          }

          await this._writeFile(outputPath, outputContent, "utf-8");
          if (this.metadataGenerator.shouldWriteMetadataFile()) {
            await this.metadataGenerator.writeMetadataFile(
              metadataOutputPath,
              metadata,
              this._writeFile.bind(this),
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
            metadataPath: this.metadataGenerator.shouldWriteMetadataFile()
              ? metadataOutputPath
              : undefined,
          });
        }
      } catch (err: unknown) {
        console.error(`Error processing item with base name ${relativeBaseName}:`, err);
        results.push({
          baseName: relativeBaseName,
          sourcePath: relativeBaseName,
          success: false,
          error: (err as Error).message || String(err),
        });
      }
    }

    return results;
  }

  /**
   * Generate output content from a mustache source file.
   * @param sourceFileName - Name of the source mustache file
   * @param buildVars - Variables to use in template rendering
   * @returns Rendered content as a string
   */
  private async generateOutputContentFromFile(
    sourceFileName: string,
    buildVars: Record<string, unknown>,
  ): Promise<string> {
    // Read source mustache template
    const sourcePath = path.join(this.getProjectScanRoot(), sourceFileName);
    const templateContent = await fs.readFile(sourcePath, "utf-8");

    return this.generateOutputContent(templateContent, buildVars);
  }

  /**
   * Generate output content from provided mustache content (no file system read).
   * @param fileContent - The mustache content to render
   * @param buildVars - Variables to use in template rendering
   * @returns Rendered content as a string
   */
  private async generateOutputContent(
    fileContent: string,
    buildVars: Record<string, unknown>,
  ): Promise<string> {
    // Render content to output
    return this.engine.render(fileContent, buildVars);
  }

  // Helper methods
  private _applyCascadeInheritance(
    configs: Array<Partial<PageConfig> | null | undefined>,
    defaultConfiguration: Partial<PageConfig>,
    currentIndex: number,
  ): PageConfig {
    if (currentIndex < 0 || currentIndex >= configs.length) {
      throw new Error(`Invalid currentIndex ${currentIndex} for inheritance`);
    }
    const currentConfig = configs[currentIndex] ?? {};
    const baseConfig = { ...defaultConfiguration, ...currentConfig };

    const isUndefinedOrNull = baseConfig.inheritFrom === undefined;
    const isEmptyArray =
      Array.isArray(baseConfig.inheritFrom) && baseConfig.inheritFrom.length === 0;

    if (isUndefinedOrNull || isEmptyArray) {
      configs[currentIndex] = baseConfig;
      return baseConfig as PageConfig;
    }

    if (Array.isArray(baseConfig.inheritFrom)) {
      for (const idx of baseConfig.inheritFrom) {
        if (idx < 0 || idx >= configs.length) {
          throw new Error(`Invalid inheritFrom index ${idx} in item at index ${currentIndex}`);
        }

        if (idx > currentIndex) {
          throw new Error(
            `Invalid inheritFrom index ${idx} must be less than or equal to the current item index ${currentIndex} to apply inheritance correctly`,
          );
        }

        Object.assign(baseConfig, configs[idx]);
      }
    }

    Object.assign(baseConfig, currentConfig);
    configs[currentIndex] = baseConfig;

    return baseConfig as PageConfig;
  }

  private async _prepareBuildVariables(
    mdConfig: PageConfig,
    sharedBuildVariables?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const buildVars: Record<string, unknown> = {
      ...mdConfig,
      ...(sharedBuildVariables ?? {}),
    };
    if (mdConfig.buildVariables) {
      for (const [key, val] of Object.entries(mdConfig.buildVariables)) {
        buildVars[key] = await this.buildVariablesLoader.load(val);
      }
    }
    return buildVars;
  }

  private async _loadPartialsIfNeeded(): Promise<void> {
    if (this.scannedForPartials === true) return;
    try {
      for (const dirPath of this.projectConfig.partials.directoryPaths) {
        const fullDirPath = path.join(this.getProjectScanRoot(), dirPath);
        await this.engine.registerPartialsFromDirectory(
          fullDirPath,
          this.projectConfig.partials.extensions,
        );
      }
      this.scannedForPartials = true;
    } catch (error) {
      console.error("Failed to load partials from directory:", error);
      throw new Error("Partial loading failed", { cause: error });
    }
  }

  private _getPageLanguage(mdConfig: PageConfig, defaultLanguage: string): string {
    return mdConfig.language ?? defaultLanguage;
  }

  private _getSourceFileName(
    relativeBaseName: string,
    extension: string,
    language: string,
    defaultLanguage: string,
  ): string {
    const extensionNoDot = extension.replace(/^\./, "");
    return joinIgnoreNone(
      // Join + Filter
      [
        relativeBaseName, // <base-name>
        language === defaultLanguage ? null : language, // <language> if not default
        extensionNoDot, // <extension>
      ],
      ".", // = <base-name>.<language>.<extension> or <base-name>
    );
  }

  private _generateOutputPath(relativeBaseName: string, extension: string): string {
    const extensionNoDot = extension.replace(/^\./, "");
    const distDir = this.projectConfig.outputRoot || "dist";
    const outputPath = path.join(
      this.getProjectRoot(),
      distDir,
      relativeBaseName + "." + extensionNoDot,
    );

    return outputPath;
  }

  private async _writeFile(...args: Parameters<typeof fs.writeFile>): Promise<void> {
    if (this.projectConfig.dedupeIdenticalDiskWrites === true) return fsWriteFileDedupe(...args);
    return fs.writeFile(...args);
  }

  /**
   * Determine the relative base name for output path generation.
   * @param relativeBaseName - Original relative base name
   * @param outputField - The output field from the page configuration
   * @returns The adjusted relative base name
   */
  private _shouldOutput(outputField: PageConfig["output"]): boolean {
    if (typeof outputField === "boolean") {
      return outputField;
    }
    if (typeof outputField === "string") {
      return outputField.trim().length > 0;
    }
    return false;
  }

  /**
   * Determine the relative base name for output path generation.
   * @param relativeBaseName - Original relative base name
   * @param outputField - The output field from the page configuration
   * @returns The adjusted relative base name
   */
  private _getRelativeBaseName(
    relativeBaseName: string,
    outputField: PageConfig["output"],
  ): string {
    if (typeof outputField === "string" && outputField.trim().length > 0) {
      return outputField.trim();
    }
    return relativeBaseName;
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
  private async loadYaml(filePath: string): Promise<Array<Record<string, unknown>>> {
    let content: string = "";
    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch (err) {
      throw new FileFetchError(filePath, err);
    }

    let docs: ReturnType<typeof yaml.parseAllDocuments> = [];
    try {
      docs = yaml.parseAllDocuments(content);
    } catch (err) {
      throw new ParseError(filePath, err);
    }

    return docs.map(
      (doc) => (doc.toJSON() as unknown as Record<string, unknown> | undefined) ?? {},
    );
  }

  /**
   * Get the project root directory.
   * @returns The project root path
   */
  private getProjectRoot(): string {
    return this.paths.projectRoot;
  }

  /**
   * Get the scan root directory.
   * @returns The scan root path
   */
  private getProjectScanRoot(): string {
    return this.paths.scanRoot;
  }
}

export default PageParser;
export type { PageConfig };
