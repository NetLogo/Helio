import fs from "fs";
import path from "path";

import type { PageConfig, PageResult, ProjectConfig } from "@repo/template";
import TemplateRenderer from "@repo/template";

import * as ArrayUtils from "@repo/utils/std/array";

import { saveNavigationMetadata } from "../helpers/navigation";
import { generatePrimitiveIndex } from "../primitive-index";

import type { Primitive } from "./entities";
import { MustachePrimitiveWrapper, TableOfContents } from "./entities";
import * as Fixtures from "./fixtures";
import { parseAllFromText } from "./parser";
import type { ExtensionConfig } from "./types";

export class ExtensionDocumentationBuilder {
  private readonly markdownTemplate = Fixtures.markdownTemplate;
  private readonly primTemplate = Fixtures.primTemplate;
  private readonly primIndexTemplate = Fixtures.primIndexTemplate;

  public readonly shortName: string;
  public readonly fullName: string;
  public readonly dirPath: string;
  public readonly config: ExtensionConfig;
  public readonly dependencies: Record<string, string>;

  public readonly prePrimitiveSections: Array<string>;
  public readonly postPrimitiveSections: Array<string>;
  public readonly primitives: Array<Primitive>;

  private readonly _renderer: TemplateRenderer;

  public constructor(
    extensionDir: string,
    private readonly autogenConfig: ProjectConfig,
  ) {
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

  public async buildHomePage(): Promise<Array<PageResult>> {
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
        version: this.autogenConfig.version,
        ...this.additionalVariables,
      },
    );
  }

  public async buildPrimitivePages(): Promise<Array<PageResult>> {
    return await generatePrimitiveIndex({
      dictionary: { entries: this.wrappedPrimitives },
      dictionaryDisplayName: this.displayName + " Dictionary",
      dictionaryHomeDirectory: "/" + this.primRoot + ".html",
      primitivesDirectory: this.primRoot,
      indexFileName: path.join("extensions", this.shortName),
      template: this.primIndexTemplate,
      renderer: this._renderer,
      buildVariables: {
        ...this.additionalVariables,
        extensionName: this.fullName,
        extensionShortName: this.shortName,
        primRoot: this.primRoot,
        version: this.autogenConfig.version,
      },
      metaVariables: this.metaVariables,
      getEntryNames: (p: MustachePrimitiveWrapper) => [p.name],
    });
  }

  public async addDirectoryMetadata(): Promise<[]> {
    const metadata = { title: this.displayName, icon: this.icon };
    const target = path.join(this._renderer.paths.outputRoot, this.primRoot);
    saveNavigationMetadata(metadata, target);
    return [];
  }

  public async buildAll(): Promise<Array<PageResult>> {
    const concatenatedResult = await Promise.all([
      this.buildHomePage(),
      this.buildPrimitivePages(),
      this.addDirectoryMetadata(),
    ]);
    return concatenatedResult.flat(1);
  }

  // Computed Properties
  public get name(): string {
    return this.shortName;
  }

  protected get displayName(): string {
    return `${this.fullName} Extension`;
  }

  protected get pageConfiguration(): Partial<PageConfig> {
    return {
      title: this.displayName,
      description: `Documentation for the ${this.fullName} extension.`,
      output: true,
      ...this.metaVariables,
    };
  }

  protected get homePageURI(): string {
    return path.join(this.shortName.toLowerCase());
  }

  protected get emptyTableOfContents(): boolean {
    return !this.config.tableOfContents || Object.keys(this.config.tableOfContents).length === 0;
  }

  protected get primRoot(): string {
    return this.shortName.toLowerCase();
  }

  protected get additionalVariables(): Record<string, unknown> {
    return this.config.additionalVariables ?? {};
  }

  protected get metaVariables(): Record<string, unknown> {
    return {
      ...this.additionalVariables,
      icon: this.icon,
      extensionName: {
        shortName: this.shortName,
        fullName: this.fullName,
      },
    };
  }

  protected get icon(): string {
    return this.config.icon;
  }

  protected get wrappedPrimitives(): Array<MustachePrimitiveWrapper> {
    return this.primitives.map((p) => new MustachePrimitiveWrapper(p));
  }

  protected get tableOfContents(): TableOfContents {
    return TableOfContents.fromPrimitives(
      this.wrappedPrimitives,
      this.config.tableOfContents ?? {},
    );
  }

  // Initialization methods
  private _getFullName(): string {
    const nameFromMap = Fixtures.autoDocumentedExtensions.get(this.shortName);
    if (!(typeof nameFromMap === "string"))
      console.warn(`Extension ${this.shortName} not found in full name map.`);
    return nameFromMap ?? this.shortName;
  }

  private _getConfigPath(): string {
    return path.join(this.dirPath, Fixtures.configFileName);
  }

  private _loadConfig(configPath: string): [ExtensionConfig, Array<Primitive>] {
    const fileContent = fs.readFileSync(configPath, "utf-8");
    const parsed = parseAllFromText(fileContent);

    if (![parsed.documentation, parsed.primitives].every(Boolean)) parsed.warnings.throw();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return [parsed.documentation!, parsed.primitives];
  }

  private _loadDependencies(): Record<string, string> {
    const dependencies = this.config.filesToIncludeInManual ?? [];
    if (dependencies.length === 0) return {};
    const dependencyEntries = dependencies
      .filter((dep) => dep !== "primitives")
      .map((dep) => {
        const depPath = path.join(this.dirPath, dep);
        if (fs.existsSync(depPath)) return [dep, fs.readFileSync(depPath, "utf-8")];
        return [dep, null];
      })
      .filter(([, content]) => content !== null);
    return Object.fromEntries(dependencyEntries) as Record<string, string>;
  }

  private _parseSections(): [Array<string>, Array<string>] {
    const dependencyNames = this.config.filesToIncludeInManual ?? [];
    const prePrimitive = ArrayUtils.takeWhile(dependencyNames, (name) => name !== "primitives");
    const postPrimitive = ArrayUtils.dropWhile(
      dependencyNames,
      (name) => name !== "primitives",
    ).slice(1); // drop the 'primitives' entry itself

    const results = [prePrimitive, postPrimitive].map((sections) =>
      sections
        .map((sectionName) => sectionName.trim())
        .map((sectionName) => {
          const content = this.dependencies[sectionName];
          if (!(typeof content === "string")) {
            console.warn(`Missing file ${sectionName} in extension ${this.shortName}.`);
          }
          return content;
        })
        .filter((e) => typeof e === "string"),
    );
    return results as [Array<string>, Array<string>];
  }

  private _createRenderer(): TemplateRenderer {
    const renderer = new TemplateRenderer({
      ...this.autogenConfig,
      scanRoot: this.dirPath,
      engine: "mustache",
    });

    renderer.registerPartial("primTemplate", this.primTemplate);
    return renderer;
  }
}

export async function getDocumentedExtensionBuilders(
  config: ProjectConfig,
  extensionDir: string | undefined = process.env["EXTENSIONS_DIR"],
): Promise<Array<ExtensionDocumentationBuilder>> {
  if (!(typeof extensionDir === "string")) {
    console.error("Environment Variable EXTENSIONS_DIR not set.");
    return [];
  }

  const scanDirectory = path.resolve(extensionDir);
  const directories = fs
    .readdirSync(scanDirectory, {
      withFileTypes: true,
    })
    .filter((dir) => dir.isDirectory())
    .filter((dir) => fs.existsSync(path.join(scanDirectory, dir.name, Fixtures.configFileName)));

  return directories
    .map((dir) => path.join(scanDirectory, dir.name))
    .map((dirPath) => new ExtensionDocumentationBuilder(dirPath, config));
}

export async function buildDocs(config: ProjectConfig): Promise<Array<PageResult>> {
  const extensions = await getDocumentedExtensionBuilders(config);
  console.log("[ExtensionDocs] Found extensions: ", extensions.map((e) => e.shortName).join(", "));
  const results = await Promise.all(extensions.map(async (ext) => ext.buildAll()));
  return results.flat(1);
}

export type { ExtensionConfig } from "./types";
export { parseAllFromText };
