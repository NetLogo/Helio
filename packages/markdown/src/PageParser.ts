import fs from 'fs/promises';
import path from 'path';

import MarkdownRenderer from './Renderer.js';
import { MarkdownPageConfig, MarkdownProjectConfig } from './schemas.js';
import { joinIgnoreNone } from './utils.js';

/**
 * @class PageParser
 *
 * Processes individual YAML files containing page configurations,
 * generating HTML files for each markdown item based on the configuration.
 *
 * This class handles:
 * - Processing YAML file data
 * - Applying inheritance between configurations
 * - Loading build variables
 * - Generating file paths
 * - Rendering markdown to HTML
 * - Writing output files
 */
class PageParser {
  private renderer: MarkdownRenderer;
  private projectConfig: MarkdownProjectConfig;

  static readonly METADATA_SUFFIX = '.metadata.json';
  static readonly HTML_SUFFIX = '.html';

  constructor(
    renderer: MarkdownRenderer,
    projectConfig: MarkdownProjectConfig
  ) {
    this.renderer = renderer;
    this.projectConfig = projectConfig;
  }

  /**
   * Process a single YAML file, generate HTML files for each markdown item.
   * The processing sequence is as follows:
   *   1. Load the YAML file, which contains an array of page declarations,
   *      each potentially with inheritance and build variables.
   *      Not all items may have output enabled; they might be used for inheritance only.
   *   2. For each item:
   *        - Apply inheritance from other items as specified. (Can throw if invalid)
   *        - Prepare build variables, loading any external variables as needed.
   *        - Concat the loaded build variables with the front matter variables.
   *        - Determine the source markdown file path based on the item configuration,
   *          including language and extension. Default language may not require a language suffix.
   *        - Determine the output HTML file path based on the project config and item settings.
   *        - If the item has `output: true`, render the markdown to HTML and write the output file.
   *
   * The output HTML files are written to the configured output directory.
   * The input markdown files are expected to be in the scan root directory and have the
   * appropriate naming schema: <yaml-name>.<language>.<extension> or <yaml-name>.<extension>.
   *
   * @param yamlFilePath - Path to the YAML file to process
   * @returns A promise that resolves when processing is complete
   */
  async processYamlFile(yamlFilePath: string): Promise<void> {
    const data = await this.renderer.loadYaml(yamlFilePath);
    const relativeBaseName = path
      .relative(this.getProjectScanRoot(), yamlFilePath) // Remove scan root
      .replace(/\.ya?ml$/i, ''); // Remove .yaml/.yml extension

    await this.processPageConfigurations(data, relativeBaseName);
    console.info(`Processed YAML file: ${yamlFilePath}`);
  }

  /**
   * Process dynamically generated page configuration objects directly, bypassing YAML file loading.
   * This method allows you to programmatically generate page configurations and process them
   * without needing to create YAML files on disk.
   *
   * @param pageConfigs - Array of page configuration objects to process
   * @param baseFileName - Base name to use for output files (replaces YAML file path logic)
   * @param markdownContent - Optional markdown content to use instead of reading from files
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
    pageConfigs: Array<Partial<MarkdownPageConfig> | null | undefined>,
    baseFileName: string,
    markdownContent?: string
  ): Promise<void> {
    await this.processPageConfigurations(
      pageConfigs,
      baseFileName,
      markdownContent
    );
    console.info(
      `Processed ${pageConfigs.length} configuration objects with base name: ${baseFileName}`
    );
  }

  /**
   * Shared implementation for processing page configurations from any source.
   * @param data - Array of page configuration objects to process
   * @param relativeBaseName - Base name for file path generation
   * @param markdownContent - Optional markdown content to use instead of reading from files
   */
  private async processPageConfigurations(
    data: Array<Partial<MarkdownPageConfig> | null | undefined>,
    relativeBaseName: string,
    markdownContent?: string
  ): Promise<void> {
    const defaults = { ...this.projectConfig.defaults };

    for (const item of data) {
      const mdConfig: MarkdownPageConfig = { ...defaults, ...(item || {}) };

      // Apply inheritance
      if (Array.isArray(mdConfig.inheritFrom)) {
        for (const idx of mdConfig.inheritFrom) {
          Object.assign(mdConfig, data[idx] || {});
        }
      }

      // Prepare build variables
      const buildVars: Record<string, any> = { ...mdConfig };
      if (mdConfig.buildVariables) {
        for (const [key, val] of Object.entries(mdConfig.buildVariables)) {
          buildVars[key] = await this.renderer.loadBuildVariable(val as string);
        }
      }

      // Determine file paths and extensions
      const language = mdConfig.language || defaults.language;
      const extension = mdConfig.extension || 'md';

      const defaultLanguage = defaults.language || 'en';
      const sourceFileName = joinIgnoreNone(
        // Join + Filter
        [
          relativeBaseName, // <base-name>
          language === defaultLanguage ? null : language, // <language> if not default
          extension, // <extension>
        ],
        '.' // = <base-name>.<language>.<extension> or <base-name>.<extension>
      );

      const distDir = this.projectConfig.outputRoot || 'dist';
      const distDirWithLang =
        language === defaultLanguage || !language
          ? distDir
          : path.join(distDir, language);
      const outputPath = path.join(
        this.getProjectRoot(),
        distDirWithLang,
        relativeBaseName + PageParser.HTML_SUFFIX
      );
      const jsonOutputPath = outputPath.replace(
        /\.html$/,
        PageParser.METADATA_SUFFIX
      );

      if (mdConfig.output) {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        if (markdownContent) {
          // Use provided markdown content directly
          await this.generateHtmlFileFromContent(
            markdownContent,
            outputPath,
            buildVars
          );
        } else {
          // Read markdown from file system as usual
          await this.generateHtmlFile(sourceFileName, outputPath, buildVars);
        }

        await this.generateMetadataJSON(
          sourceFileName,
          jsonOutputPath,
          mdConfig
        );
      }
    }
  }

  /**
   * Generate an HTML file from a markdown source.
   * @param sourceFileName - Name of the source markdown file
   * @param outputPath - Path where the HTML file should be written
   * @param buildVars - Variables to use in template rendering
   */
  private async generateHtmlFile(
    sourceFileName: string,
    outputPath: string,
    buildVars: Record<string, any>
  ): Promise<void> {
    // Read source markdown template
    const sourcePath = path.join(this.getProjectScanRoot(), sourceFileName);
    const templateContent = await fs.readFile(sourcePath, 'utf-8');

    await this.renderAndWriteHtml(
      templateContent,
      outputPath,
      buildVars,
      `Generated HTML: ${outputPath}`
    );
  }

  /**
   * Generate an HTML file from provided markdown content (no file system read).
   * @param markdownContent - The markdown content to render
   * @param outputPath - Path where the HTML file should be written
   * @param buildVars - Variables to use in template rendering
   */
  private async generateHtmlFileFromContent(
    markdownContent: string,
    outputPath: string,
    buildVars: Record<string, any>
  ): Promise<void> {
    await this.renderAndWriteHtml(
      markdownContent,
      outputPath,
      buildVars,
      `Generated HTML from content: ${outputPath}`
    );
  }

  /**
   * Render markdown content to HTML and write to file (shared implementation).
   * @param markdownContent - The markdown content to render
   * @param outputPath - Path where the HTML file should be written
   * @param buildVars - Variables to use in template rendering
   * @param logMessage - Message to log after successful write
   */
  private async renderAndWriteHtml(
    markdownContent: string,
    outputPath: string,
    buildVars: Record<string, any>,
    logMessage: string
  ): Promise<void> {
    // Render markdown to HTML
    const renderedHtml = this.renderer.render(markdownContent, buildVars);

    // Write output HTML file
    await fs.writeFile(outputPath, renderedHtml, 'utf-8');
    console.info(logMessage);
  }

  /**
   * Generate a metadata JSON file alongside the HTML output.
   * @param sourceFileName - Name of the source markdown file
   * @param outputPath - Path where the JSON file should be written
   * @param mdConfig - The markdown page configuration
   */
  private async generateMetadataJSON(
    sourceFileName: string,
    outputPath: string,
    mdConfig: MarkdownPageConfig
  ): Promise<void> {
    const metadata = {
      source: sourceFileName,
      ...mdConfig,
    };

    await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.info(`Generated metadata JSON: ${outputPath}`);
  }

  /**
   * Get the project root directory.
   * @returns The project root path
   */
  private getProjectRoot(): string {
    return this.renderer.projectRoot!;
  }

  /**
   * Get the scan root directory.
   * @returns The scan root path
   */
  private getProjectScanRoot(): string {
    return this.renderer.scanRoot!;
  }
}

export default PageParser;
export type { MarkdownPageConfig };
