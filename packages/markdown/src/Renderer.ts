import fs from 'fs/promises';
import MarkdownIt from 'markdown-it';
import mustache from 'mustache';
import path from 'path';
import yaml from 'yaml';

import { BuildVariable, BuildVariablesLoader } from './BuildVariablesLoader.js';
import {
  FileFetchError,
  InitializationError,
  ParseError,
  RenderError,
} from './errors.js';
import PageParser from './PageParser.js';
import { ProjectConfigLoader } from './ProjectConfigLoader.js';
import { MarkdownProjectConfig } from './schemas.js';

/**
 * @class MarkdownRenderer
 *
 * Processes markdown files driven by YAML front matter and configuration,
 * generating rendered HTML files.
 *
 * @constructor
 * @param {string} configPath - Path to the configuration JSON file.
 */
class MarkdownRenderer {
  static readonly markdownIt = new MarkdownIt();
  static buildVariablesLoader: BuildVariablesLoader | undefined = undefined;

  projectConfig: MarkdownProjectConfig | undefined;
  projectRoot: string | undefined;
  scanRoot: string | undefined;
  outputRoot: string | undefined;
  defaultLanguage: string | undefined;
  pageProcessor: PageParser | undefined;
  initialized = false;

  constructor(private configPath: string) {}
  static fromConfigObject(config: MarkdownProjectConfig): MarkdownRenderer {
    const renderer = new MarkdownRenderer(''); // Empty path, will not be used
    renderer.projectConfig = config;
    return renderer;
  }

  /**
   * Initialize the builder by loading config and setting up paths.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      console.warn('MarkdownRenderer is already initialized.');
      return; // Already initialized
    }

    if (this.projectConfig) {
      console.warn(
        'MarkdownRenderer already has a projectConfig set. Skipping config load.'
      );
    } else {
      this.projectConfig = await ProjectConfigLoader.load(this.configPath);
    }

    if (!this.projectConfig) {
      throw new InitializationError(
        'Project configuration not loaded. Ensure init() is called with a valid config path.'
      );
    }

    this.scanRoot = path.resolve(
      process.cwd(),
      this.projectConfig.scanRoot || '.'
    );
    this.projectRoot = path.resolve(
      process.cwd(),
      this.projectConfig.projectRoot || '.'
    );
    this.outputRoot = path.join(
      this.projectRoot,
      this.projectConfig.outputRoot || 'dist'
    );
    this.defaultLanguage = this.projectConfig.defaults?.language || 'en';

    // BuildVariablesLoader
    if (!MarkdownRenderer.buildVariablesLoader) {
      MarkdownRenderer.buildVariablesLoader = new BuildVariablesLoader(
        this.projectRoot
      );
    }

    // PageParser
    this.pageProcessor = new PageParser(this, this.projectConfig);

    this.initialized = true;
  }

  private ensureInitialized() {
    if (!this.initialized) {
      throw new InitializationError(
        'MarkdownRenderer not initialized. Call init() before using.'
      );
    }
  }

  /**
   * Recursively find YAML files under the scanRoot directory.
   * @returns – A promise that resolves to an array of YAML file paths.
   *
   * @throws {InitializationError} If the renderer has not been initialized.
   */
  async findYamlFiles() {
    this.ensureInitialized();

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

    await walk(this.scanRoot!);
    return yamlFiles;
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
  async loadYaml(filePath: string) {
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
    this.ensureInitialized();
    return MarkdownRenderer.buildVariablesLoader!.load(value);
  }

  /**
   * Render markdown/mustache content with given variables.
   * @param content - Markdown template content
   * @param variables - Variables to interpolate
   * @returns Rendered HTML
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

    let htmlOutput;
    try {
      htmlOutput = MarkdownRenderer.markdownIt.render(rendered);
    } catch (error: any) {
      throw new RenderError(`Failed to render HTML output`, error.message);
    }
    return htmlOutput;
  }

  /**
   * Run the full build process: find YAML files and process each.
   * @returns {Promise<void>}
   */
  async run() {
    await this.init();
    const yamlFiles = await this.findYamlFiles();
    await this.pageProcessor!.processYamlFiles(yamlFiles);
  }
}

export default MarkdownRenderer;
