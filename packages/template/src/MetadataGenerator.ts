import fs from "fs/promises";
import path from "path";
import yaml from "yaml";

import type { PageConfig, PageMetadata, ProjectConfig } from "./schemas.js";

/**
 * Handles metadata generation for pages based on project configuration.
 * Supports multiple output formats: separate file, prepended YAML, or prepended JSON.
 */
export class MetadataGenerator {
  public static readonly METADATA_SUFFIX = ".metadata";

  constructor(private readonly projectConfig: ProjectConfig) {}

  public isEnabled(): boolean {
    return this.projectConfig.metadata?.enabled ?? false;
  }

  /**
   * Generates metadata as a standalone JSON file
   * @param metadata - The metadata object to write
   * @returns JSON string representation
   */
  public generateMetadataFile(metadata: PageMetadata): string {
    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Prepends metadata to content based on configuration
   * @param content - The original content
   * @param metadata - The metadata to prepend
   * @returns Content with prepended metadata
   */
  public prependMetadata(content: string, metadata: Record<string, unknown>): string {
    const config = this.projectConfig.metadata;

    if (!config || config.kind !== "prepend") {
      return content;
    }

    if (config.prepend?.method) {
      return config.prepend.method({ content, metadata });
    }

    const separator = config.prepend?.separator ?? "---";
    const format = config.prepend?.format ?? "yaml";

    let metadataString: string;
    if (format === "json") {
      metadataString = JSON.stringify(metadata, null, 2);
    } else {
      const yamlStr = yaml.stringify(metadata);
      metadataString = yamlStr ? yamlStr.trimEnd() : "";
    }

    return `${separator}\n${metadataString}\n${separator}\n\n${content}`;
  }

  /**
   * Creates a metadata object from page configuration
   * @param source - Relative path to source file
   * @param metadataOutputPath - Relative path to metadata output
   * @param pageConfig - The page configuration
   * @returns Complete metadata object (with optional transform applied)
   */
  public createMetadata(
    source: string,
    metadataOutputPath: string,
    pageConfig: PageConfig,
  ): PageMetadata {
    const { metadata: _, locale, ...projectConfig } = this.projectConfig;

    let metadata: PageMetadata = {
      source,
      metadataOutputPath,
      projectConfig,
      ...pageConfig,
    };

    const transform = this.projectConfig.metadata?.transform;
    if (transform) {
      metadata = transform(metadata) as PageMetadata;
    }

    return metadata;
  }

  /**
   * Generates the metadata output file path for a given output path
   * @param outputPath - The output file path
   * @returns The metadata file path
   */
  public generateMetadataOutputPath(outputPath: string): string {
    const ext = path.extname(outputPath);
    const format = this.projectConfig.metadata?.prepend?.format ?? "json";
    return outputPath.replace(
      new RegExp(`${ext.replace(".", "\\.")}$`),
      `${MetadataGenerator.METADATA_SUFFIX}.${format}`,
    );
  }

  /**
   * Writes metadata to a file
   * @param metadataPath - Path where the metadata file should be written
   * @param metadata - The metadata object to write
   */
  public async writeMetadataFile(
    metadataPath: string,
    metadata: PageMetadata,
    writeFileFunction: typeof fs.writeFile = fs.writeFile,
  ): Promise<void> {
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    const content = this.generateMetadataFile(metadata);
    await writeFileFunction(metadataPath, content, "utf-8");
  }

  /**
   * Determines if metadata should be written as a separate file
   */
  public shouldWriteMetadataFile(): boolean {
    const config = this.projectConfig.metadata;
    return config?.enabled === true && (config.kind === "file" || !config.kind);
  }

  /**
   * Determines if metadata should be prepended to content
   */
  public shouldPrependMetadata(): boolean {
    const config = this.projectConfig.metadata;
    return config?.enabled === true && config.kind === "prepend";
  }
}
