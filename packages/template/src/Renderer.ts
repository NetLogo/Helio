import fs from "fs/promises";
import Handlebars from "handlebars";
import mustache from "mustache";
import path from "path";

import type { BuildResult, PageResult } from "./api.schemas.js";
import { BuildVariablesLoader } from "./BuildVariablesLoader.js";
import type { HandlebarsEngine, MustacheEngine, TemplateEngine } from "./engines.js";
import { createTemplateEngine } from "./engines.js";
import { InitializationError, RenderError } from "./errors.js";
import PageParser from "./PageParser.js";
import type { PageConfig, ProjectConfig, ProjectConfigInput } from "./schemas.js";
import { ProjectConfigSchema } from "./schemas.js";

/**
 * @class TemplateRenderer
 *
 * High-level interface for rendering mustache/handlebars
 * templates driven by YAML front matter or equivalent
 * JSON configuration.
 *
 */
class Renderer {
  private readonly _buildVariablesLoader: BuildVariablesLoader;
  private readonly _pageParser: PageParser;
  private readonly _engine: TemplateEngine;
  public paths: {
    projectRoot: string;
    scanRoot: string;
    outputRoot: string;
  };
  public defaultLanguage: string;
  public readonly config: ProjectConfig;

  public constructor(config: ProjectConfigInput) {
    const parseResult = ProjectConfigSchema.safeParse(config);
    if (!parseResult.success) {
      throw new InitializationError("Invalid project configuration provided to Renderer.");
    }
    this.config = parseResult.data;

    this.paths = {
      projectRoot: path.resolve(process.cwd(), this.config.projectRoot || "."),
      scanRoot: path.resolve(process.cwd(), this.config.scanRoot || "."),
      outputRoot: path.resolve(process.cwd(), this.config.outputRoot || "dist"),
    };

    this._engine = createTemplateEngine(this.config.engine);

    this.defaultLanguage = this.config.defaults.language ?? "en";
    this._buildVariablesLoader = new BuildVariablesLoader(this.paths.scanRoot);
    this._pageParser = new PageParser(
      this._engine,
      this._buildVariablesLoader,
      this.config,
      this.paths,
    );
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
  public async build(sharedBuildVariables?: Record<string, unknown>): Promise<BuildResult> {
    const startTime = new Date();
    const errors: Array<string> = [];
    const pages: Record<string, PageResult> = {};

    try {
      const yamlFiles = await this.findYamlFiles();

      for (const yamlPath of yamlFiles) {
        try {
          const pageResults = await this.buildSingle(yamlPath, sharedBuildVariables);
          for (const pageResult of pageResults) {
            pages[pageResult.sourcePath] = pageResult;
          }
        } catch (error: unknown) {
          errors.push(`Failed to build ${yamlPath}: ${(error as Error).message}`);
        }
      }

      const endTime = new Date();
      const successfulPages = Object.values(pages).filter((p) => p.success).length;
      const failedPages = Object.values(pages).filter((p) => !p.success).length;

      const result = {
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
      return result;
    } catch (error: unknown) {
      const endTime = new Date();
      errors.push(`Build failed: ${(error as Error).message}`);

      const result = {
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

      return result;
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
  public async buildSingle(
    yamlPath: string,
    sharedBuildVariables?: Record<string, unknown>,
  ): Promise<Array<PageResult>> {
    try {
      yamlPath = path.resolve(this.paths.scanRoot, yamlPath);
      const pages = await this._pageParser.processYamlFile(yamlPath, sharedBuildVariables);
      return pages;
    } catch (error: unknown) {
      console.warn(`Error processing ${yamlPath}: ${(error as Error).message}`);
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
  public async buildFromConfiguration(
    config: Array<Partial<PageConfig>>,
    baseFileName: string,
    content?: string,
    sharedBuildVariables?: Record<string, unknown>,
  ): Promise<Array<PageResult>> {
    try {
      const pages = await this._pageParser.processConfigurations(
        config,
        baseFileName,
        content,
        sharedBuildVariables,
      );
      return pages;
    } catch {
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
  public render(content: string, variables: Record<string, unknown>): string {
    let rendered = "";
    try {
      if (this.config.engine === "handlebars") {
        const template = Handlebars.compile(content);
        rendered = template(variables);
      } else {
        rendered = mustache.render(content, variables);
      }

      if (!rendered) {
        throw new RenderError("Rendered output is empty");
      }
    } catch (error: unknown) {
      const engineName = this.config.engine === "handlebars" ? "Handlebars" : "Mustache";
      throw new RenderError(`Failed to render ${engineName} template`, (error as Error).message);
    }
    return rendered;
  }

  // Public Methods
  public registerPartial(name: string, content: string): void {
    this._engine.registerPartial(name, content);
  }

  public getNamedEngine(name: "mustache"): MustacheEngine | undefined;
  public getNamedEngine(name: "handlebars"): HandlebarsEngine | undefined;
  public getNamedEngine(
    name: "mustache" | "handlebars",
  ): MustacheEngine | HandlebarsEngine | undefined {
    switch (name) {
      case "mustache":
        return this.config.engine === "mustache" ? (this._engine as MustacheEngine) : undefined;
      case "handlebars":
        return this.config.engine === "handlebars" ? (this._engine as HandlebarsEngine) : undefined;
      default:
        return undefined;
    }
  }

  // Helper Public API
  public getOutputFilePath(relativeBaseName: string, extension: string): string {
    const extensionNoDot = extension.replace(/^\./, "");
    return path.join(this.paths.outputRoot, relativeBaseName + "." + extensionNoDot);
  }

  public getMetadataFilePath(relativeBaseName: string): string {
    return path.join(this.paths.outputRoot, relativeBaseName + PageParser.METADATA_SUFFIX);
  }

  public getSourceFilePath(relativeBaseName: string, extension: string): string {
    const extensionNoDot = extension.replace(/^\./, "");
    return path.join(this.paths.scanRoot, relativeBaseName + "." + extensionNoDot);
  }

  // Private methods
  /**
   * Recursively find YAML files under the scanRoot directory.
   * @returns – A promise that resolves to an array of YAML file paths.
   *
   * @throws {InitializationError} If the renderer has not been initialized.
   */
  private async findYamlFiles(): Promise<Array<string>> {
    const yamlFiles: Array<string> = [];

    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const res = path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(res);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))
        ) {
          yamlFiles.push(res);
        }
      }
    }

    await walk(this.paths.scanRoot);
    return yamlFiles;
  }
}

export default Renderer;
