import fs from 'fs';
import path from 'path';

import MustacheRenderer, { PageConfig, PageResult } from '@repo/mustache';

import { ArrayUtils } from '@repo/utils/std/array';
import autogenConfig from '../autogen.config';
import { generatePrimitiveIndex } from '../PrimIndex';
import {
  MustachePrimitiveWrapper,
  Primitive,
  TableOfContents,
} from './entities';
import * as Fixtures from './fixtures';
import { parseAllFromText } from './parser';
import { ExtensionConfig } from './types';

export class ExtensionDocumentationBuilder {
  markdownTemplate = Fixtures.markdownTemplate;
  primTemplate = Fixtures.primTemplate;
  primIndexTemplate = Fixtures.primIndexTemplate;

  public readonly shortName: string;
  public readonly fullName: string;
  public readonly dirPath: string;
  public readonly config: ExtensionConfig;
  public readonly dependencies: Record<string, string>;

  public readonly prePrimitiveSections: Array<string>;
  public readonly postPrimitiveSections: Array<string>;
  public readonly primitives: Primitive[];

  private _renderer: MustacheRenderer;

  constructor(extensionDir: string) {
    this.dirPath = path.resolve(extensionDir);
    this.shortName = path.basename(this.dirPath);
    this.fullName = this._getFullName();

    // ./parser.ts is invoked here
    const [config, prims] = this._loadConfig(this._getConfigPath());
    this.config = config;
    this.primitives = prims;

    this.dependencies = this._loadDependencies();

    const [prePrims, postPrims] = this._parseSections();
    this.prePrimitiveSections = prePrims;
    this.postPrimitiveSections = postPrims;

    this._renderer = this._createRenderer();
  }

  async buildHomePage(): Promise<Array<PageResult>> {
    return await this._renderer.buildFromConfiguration(
      [this.pageConfiguration],
      this.homePageURI,
      this.markdownTemplate,
      {
        extensionName: this.fullName,
        extensionShortName: this.shortName,
        primitives: this.wrappedPrimitives,
        contents: this.tableOfContents.sections,
        prePrimitiveSections: this.prePrimitiveSections,
        postPrimitiveSections: this.postPrimitiveSections,
        emptyTableOfContents: this.emptyTableOfContents,
        primRoot: this.primRoot,
        ...this.additionalVariables,
      }
    );
  }

  async buildPrimitivePages(): Promise<Array<PageResult>> {
    return await generatePrimitiveIndex({
      dictionary: { entries: this.wrappedPrimitives },
      dictionaryDisplayName: this.displayName + ' Dictionary',
      dictionaryHomeDirectory: this.primRoot,
      indexFileName: `extensions/${this.shortName}`,
      template: this.primIndexTemplate,
      renderer: this._renderer,
      buildVariables: this.additionalVariables,
      getEntryNames: (p) => [p.name],
    });
  }

  async buildAll(): Promise<Array<PageResult>> {
    const concatedResult = await Promise.all([
      this.buildHomePage(),
      this.buildPrimitivePages(),
    ]);
    return concatedResult.flat(1);
  }

  // Computed Properties
  get name(): string {
    return this.shortName;
  }

  get displayName(): string {
    return `${this.fullName} Extension`;
  }

  get pageConfiguration(): Partial<PageConfig> {
    return {
      title: this.displayName,
      description: `Documentation for the ${this.fullName} extension.`,
      output: true,
    };
  }

  get homePageURI(): string {
    return `extensions/${this.shortName.toLowerCase()}`;
  }

  get emptyTableOfContents(): boolean {
    return (
      !this.config.tableOfContents ||
      Object.keys(this.config.tableOfContents).length === 0
    );
  }

  get primRoot(): string {
    return this.shortName.toLowerCase();
  }

  get additionalVariables(): Record<string, unknown> {
    return this.config.additionalVariables || {};
  }

  get wrappedPrimitives(): MustachePrimitiveWrapper[] {
    return this.primitives.map((p) => new MustachePrimitiveWrapper(p));
  }

  get tableOfContents(): TableOfContents {
    return TableOfContents.fromPrimitives(
      this.wrappedPrimitives,
      this.config.tableOfContents || {}
    );
  }

  // Initialization methods
  private _getFullName(): string {
    const nameFromMap = Fixtures.autoDocumentedExtensions.get(this.shortName);
    if (!nameFromMap)
      console.warn(`Extension ${this.shortName} not found in full name map.`);
    return nameFromMap || this.shortName;
  }

  private _getConfigPath(): string {
    return path.join(this.dirPath, Fixtures.configFileName);
  }

  private _loadConfig(configPath: string): [ExtensionConfig, Primitive[]] {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const parsed = parseAllFromText(fileContent);

    if (!parsed.documentation || !parsed.primitives) parsed.warnings.throw();

    return [parsed.documentation!, parsed.primitives!];
  }

  private _loadDependencies(): Record<string, string> {
    const dependencies = this.config.filesToIncludeInManual || [];
    if (dependencies.length === 0) return {};
    const dependencyEntries = dependencies
      .filter((dep) => dep !== 'primitives')
      .map((dep) => {
        const depPath = path.join(this.dirPath, dep);
        if (fs.existsSync(depPath))
          return [dep, fs.readFileSync(depPath, 'utf-8')];
        return [dep, null];
      })
      .filter(([, content]) => content !== null);
    return Object.fromEntries(dependencyEntries);
  }

  private _parseSections(): [Array<string>, Array<string>] {
    const dependencyNames = this.config.filesToIncludeInManual || [];
    const prePrimitive = ArrayUtils.takeWhile(
      dependencyNames,
      (name) => name !== 'primitives'
    );
    const postPrimitive = ArrayUtils.dropWhile(
      dependencyNames,
      (name) => name !== 'primitives'
    ).slice(1); // drop the 'primitives' entry itself

    const results = [prePrimitive, postPrimitive].map((sections) =>
      sections
        .map((sectionName) => sectionName.trim())
        .map((sectionName) => {
          const content = this.dependencies[sectionName];
          if (!content) {
            console.warn(
              `Missing file ${sectionName} in extension ${this.shortName}.`
            );
          }
          return content;
        })
        .filter((e) => typeof e === 'string')
    );
    return results as [Array<string>, Array<string>];
  }

  private _createRenderer(): MustacheRenderer {
    const renderer = new MustacheRenderer({
      ...autogenConfig,
      scanRoot: this.dirPath,
      engine: 'mustache',
    });

    renderer.registerPartial('primTemplate', this.primTemplate);
    return renderer;
  }
}

export async function getDocumentedExtensionBuilders(): Promise<
  ExtensionDocumentationBuilder[]
> {
  const extensionDir = process.env['EXTENSIONS_DIR'];
  if (!extensionDir) {
    console.error('Environment Variable EXTENSIONS_DIR not set.');
    return [];
  }

  const scanDirectory = path.resolve(extensionDir);
  const directories = fs
    .readdirSync(scanDirectory, {
      withFileTypes: true,
    })
    .filter((dir) => dir.isDirectory())
    .filter((dir) =>
      fs.existsSync(path.join(scanDirectory, dir.name, Fixtures.configFileName))
    );

  return directories
    .map((dir) => path.join(scanDirectory, dir.name))
    .map((dirPath) => new ExtensionDocumentationBuilder(dirPath));
}

export async function buildDocs() {
  const extensions = await getDocumentedExtensionBuilders();
  const results = await Promise.all(extensions.map((ext) => ext.buildAll()));
  return results.flat(1);
}
