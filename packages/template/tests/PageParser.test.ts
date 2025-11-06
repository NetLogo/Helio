import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs/promises";
import yaml from "yaml";

import { BuildVariablesLoader } from "../src/BuildVariablesLoader.js";
import { TemplateEngine } from "../src/engines.js";
import { FileFetchError, ParseError } from "../src/errors.js";
import PageParser from "../src/PageParser.js";
import type Renderer from "../src/Renderer.js";
import type { PageConfig, ProjectConfig } from "../src/schemas.js";

// Mock dependencies
jest.mock("fs/promises");
jest.mock("yaml");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;

describe("PageParser", () => {
  let pageParser: PageParser;
  let mockRenderer: jest.Mocked<Renderer>;
  let mockBuildVariablesLoader: jest.Mocked<BuildVariablesLoader>;
  let mockEngine: jest.Mocked<TemplateEngine>;
  let mockProjectConfig: ProjectConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock renderer with all required properties and methods
    mockRenderer = {
      paths: {
        projectRoot: "/project",
        scanRoot: "/project/src",
        outputRoot: "/project/dist",
      },
      render: jest.fn(),
      loadBuildVariable: jest.fn(),
    } as any;

    mockProjectConfig = {
      version: "1.0.0",
      projectRoot: ".",
      scanRoot: "./src",
      outputRoot: "./dist",
      defaults: {
        language: "en",
        extension: "md",
        output: true,
        title: "Default Title",
        description: "Default Description",
      },
      metadata: {
        enabled: true,
        kind: "file",
      },
      locale: {
        toSlug: ({ language, defaultLanguage, slug }) =>
          language !== defaultLanguage ? `${language}/${slug}` : slug,
      },
      partials: {
        directoryPaths: ["."],
        extensions: ["mustache", "md"],
      },
    };

    mockBuildVariablesLoader = {
      supportedFileTypes: "json, yaml, yml, xml, nlogox, ini",
      load: jest.fn(),
      fetch: jest.fn(),
    } as any;

    mockEngine = {
      render: jest.fn(),
      registerPartial: jest.fn(),
      registerPartialsFromDirectory: jest.fn(),
    } as any;

    pageParser = new PageParser(
      mockEngine,
      mockBuildVariablesLoader,
      mockProjectConfig,
      mockRenderer.paths,
    );

    // Default mock implementations
    mockEngine.render.mockReturnValue("Rendered content");
    mockEngine.registerPartial.mockImplementation(() => {});
    mockEngine.registerPartialsFromDirectory.mockResolvedValue([]);
    mockBuildVariablesLoader.load.mockResolvedValue({ key: "value" });
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue("# {{title}}\n\n{{description}}");
    // Mock yaml.stringify to return YAML formatted string
    mockYaml.stringify.mockImplementation((obj) => {
      // Simple YAML formatting for test purposes
      return Object.entries(obj)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("\n");
    });
  });

  describe("constructor", () => {
    it("should create PageParser with renderer and config", () => {
      expect(pageParser).toBeInstanceOf(PageParser);
      expect(pageParser["engine"]).toBe(mockEngine);
      expect(pageParser["buildVariablesLoader"]).toBe(mockBuildVariablesLoader);
      expect(pageParser["paths"]).toBe(mockRenderer.paths);
      expect(pageParser["projectConfig"]).toBe(mockProjectConfig);
    });

    it("should set METADATA_SUFFIX constant", () => {
      expect(PageParser.METADATA_SUFFIX).toBe(".metadata.json");
    });
  });

  describe("processYamlFile", () => {
    beforeEach(() => {
      mockFs.readFile.mockResolvedValue("title: Test\noutput: true");
      mockYaml.parseAllDocuments.mockReturnValue([
        { toJSON: () => ({ title: "Test", output: true }) },
      ] as any);
    });

    it("should process YAML file successfully", async () => {
      const yamlPath = "/project/src/test.yaml";
      const results = await pageParser.processYamlFile(yamlPath);

      expect(mockFs.readFile).toHaveBeenCalledWith(yamlPath, "utf-8");
      expect(mockYaml.parseAllDocuments).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].sourcePath).toBe("/project/src/test.md");
    });

    it("should handle file read error", async () => {
      const yamlPath = "/project/src/missing.yaml";
      const error = new Error("File not found");
      mockFs.readFile.mockRejectedValue(error);

      await expect(pageParser.processYamlFile(yamlPath)).rejects.toThrow(FileFetchError);
    });

    it("should handle YAML parse error", async () => {
      const yamlPath = "/project/src/invalid.yaml";
      const error = new Error("Invalid YAML");
      mockYaml.parseAllDocuments.mockImplementation(() => {
        throw error;
      });

      await expect(pageParser.processYamlFile(yamlPath)).rejects.toThrow(ParseError);
    });

    it("should calculate relative base name correctly", async () => {
      const yamlPath = "/project/src/docs/guide.yaml";
      mockFs.readFile.mockResolvedValue("title: Guide");
      mockYaml.parseAllDocuments.mockReturnValue([
        { toJSON: () => ({ title: "Guide", output: true }) },
      ] as any);

      const results = await pageParser.processYamlFile(yamlPath);
      expect(results[0].sourcePath).toBe("/project/src/docs/guide.md");
    });

    it("should handle .yml extension", async () => {
      const yamlPath = "/project/src/test.yml";
      mockFs.readFile.mockResolvedValue("title: Test");
      mockYaml.parseAllDocuments.mockReturnValue([{ toJSON: () => ({ title: "Test" }) }] as any);

      const results = await pageParser.processYamlFile(yamlPath);
      expect(results[0].sourcePath).toBe("/project/src/test.md");
    });

    it("should handle empty YAML documents", async () => {
      const yamlPath = "/project/src/empty.yaml";
      mockYaml.parseAllDocuments.mockReturnValue([
        { toJSON: () => null },
        { toJSON: () => ({}) },
      ] as any);

      const results = await pageParser.processYamlFile(yamlPath);
      expect(results).toHaveLength(2);
    });
  });

  describe("processConfigurations", () => {
    it("should process configurations without file content", async () => {
      const configs = [
        { title: "Config 1", output: true },
        { title: "Config 2", output: true, language: "es" },
      ];

      const results = await pageParser.processConfigurations(configs, "dynamic");

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalledTimes(2); // Reading source files
    });

    it("should process configurations with file content", async () => {
      const configs = [{ title: "Dynamic", output: true }];
      const content = "# {{title}}\n\nDynamic content";

      const results = await pageParser.processConfigurations(configs, "dynamic", content);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockFs.readFile).not.toHaveBeenCalled(); // Should not read from filesystem
      expect(mockEngine.render).toHaveBeenCalledWith(content, expect.any(Object));
    });

    it("should handle null and undefined configurations", async () => {
      const configs = [
        { title: "Valid", output: true },
        null,
        undefined,
        { title: "Another Valid", output: true },
      ];

      const results = await pageParser.processConfigurations(configs, "mixed");

      expect(results).toHaveLength(4);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true); // null/undefined should be handled gracefully
      expect(results[2].success).toBe(true);
      expect(results[3].success).toBe(true);
    });
  });

  describe("processPageConfigurations (private method)", () => {
    it("should apply default configuration", async () => {
      const configs = [{ title: "Test" }];

      const results = await pageParser["processPageConfigurations"](configs, "test");

      expect(results[0].title).toBe("Test");
      expect(results[0].language).toBe("en"); // from defaults
    });

    it("should apply inheritance correctly", async () => {
      const configs = [
        { title: "Base", description: "Base description", output: true },
        { inheritFrom: [0], title: "Inherited", output: true },
      ];

      const results = await pageParser["processPageConfigurations"](configs, "inherit");

      expect(results[1].title).toBe("Inherited");
      expect(results[1].description).toBe("Base description"); // Inherited
    });

    it("should handle invalid inheritance indices", async () => {
      const configs = [
        { title: "Valid", output: true },
        { inheritFrom: [5], title: "Invalid", output: true }, // Index 5 doesn't exist
      ];

      const results = await pageParser["processPageConfigurations"](configs, "invalid");

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain("Invalid inheritFrom index");
    });

    it("should handle non-cascade inheritance", async () => {
      const configs = [
        { title: "Valid", output: true },
        { inheritFrom: [2], title: "Invalid", output: true }, // Index 2 is ahead of this one
        { title: "Invalid", output: true },
      ];

      const results = await pageParser["processPageConfigurations"](configs, "non-cascade");

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain("Invalid inheritFrom index");
      expect(results[2].success).toBe(true);
    });

    it("should load build variables", async () => {
      mockBuildVariablesLoader.load.mockResolvedValue({ loaded: "data" });
      const configs = [
        {
          title: "Test",
          output: true,
          buildVariables: {
            external: "config.json",
          },
        },
      ];

      await pageParser["processPageConfigurations"](configs, "build-vars");

      expect(mockBuildVariablesLoader.load).toHaveBeenCalledWith("config.json");
      expect(mockEngine.render).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          external: { loaded: "data" },
        }),
      );
    });

    it("should generate correct source file names for default language", async () => {
      const configs = [{ title: "English", language: "en", output: true }];

      const results = await pageParser["processPageConfigurations"](configs, "test");

      expect(results[0].sourcePath).toBe("/project/src/test.md"); // No language suffix for default
    });

    it("should generate correct source file names for non-default language", async () => {
      const configs = [{ title: "Spanish", language: "es", output: true }];

      const results = await pageParser["processPageConfigurations"](configs, "test");

      expect(results[0].sourcePath).toBe("/project/src/test.es.md"); // Language suffix for non-default
    });

    it("should generate correct output paths for default language", async () => {
      const configs = [{ title: "English", language: "en", output: true }];

      const results = await pageParser["processPageConfigurations"](configs, "test");

      expect(results[0].outputPath).toBe("/project/dist/test.md");
    });

    it("should generate correct output paths for non-default language", async () => {
      const configs = [{ title: "Spanish", language: "es", output: true }];

      const results = await pageParser["processPageConfigurations"](configs, "test");

      expect(results[0].outputPath).toBe("/project/dist/es/test.md");
    });

    it("should skip output generation when output is false", async () => {
      const configs = [{ title: "No Output", output: false }];

      await pageParser["processPageConfigurations"](configs, "no-output");

      expect(mockFs.writeFile).not.toHaveBeenCalled();
      expect(mockEngine.render).not.toHaveBeenCalled();
    });

    it("should create output directories", async () => {
      const configs = [{ title: "Test", output: true }];

      await pageParser["processPageConfigurations"](configs, "test");

      expect(mockFs.mkdir).toHaveBeenCalledWith("/project/dist", {
        recursive: true,
      });
    });

    it("should handle rendering errors gracefully", async () => {
      mockEngine.render.mockImplementation(() => {
        throw new Error("Rendering failed");
      });
      const configs = [{ title: "Test", output: true }];

      const results = await pageParser["processPageConfigurations"](configs, "error");

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Rendering failed");
    });

    it("should handle file write errors gracefully", async () => {
      mockFs.writeFile.mockRejectedValue(new Error("Write failed"));
      const configs = [{ title: "Test", output: true }];

      const results = await pageParser["processPageConfigurations"](configs, "write-error");

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Write failed");
    });

    it("should handle different file extensions", async () => {
      const configs = [
        { title: "Markdown", extension: "md", output: true },
        { title: "HTML", extension: "html", output: true },
        { title: "Text", extension: ".txt", output: true }, // With dot
      ];

      const results = await pageParser["processPageConfigurations"](configs, "extensions");

      expect(results[0].sourcePath).toBe("/project/src/extensions.md");
      expect(results[1].sourcePath).toBe("/project/src/extensions.html");
      expect(results[2].sourcePath).toBe("/project/src/extensions.txt");
    });

    it("should generate metadata JSON files", async () => {
      const configs = [{ title: "Test", output: true }];

      await pageParser["processPageConfigurations"](configs, "metadata");

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/project/dist/metadata.metadata.json",
        expect.stringContaining('"title": "Test"'),
        "utf-8",
      );
    });

    it("should set correct metadata path in results", async () => {
      const configs = [{ title: "Test", output: true }];

      const results = await pageParser["processPageConfigurations"](configs, "metadata");

      expect(results[0].metadataPath).toBe("/project/dist/metadata.metadata.json");
    });
  });

  describe("generateOutputContentFromFile (private method)", () => {
    it("should read source file and generate output content", async () => {
      const sourceContent = "# {{title}}\n{{description}}";
      mockFs.readFile.mockResolvedValue(sourceContent);

      const result = await pageParser["generateOutputContentFromFile"]("test.md", {
        title: "Test",
        description: "Description",
      });

      expect(mockFs.readFile).toHaveBeenCalledWith("/project/src/test.md", "utf-8");
      expect(mockEngine.render).toHaveBeenCalledWith(sourceContent, {
        title: "Test",
        description: "Description",
      });
      expect(result).toBe("Rendered content");
    });

    it("should handle file read errors", async () => {
      mockFs.readFile.mockRejectedValue(new Error("File not found"));

      await expect(pageParser["generateOutputContentFromFile"]("missing.md", {})).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("generateOutputContent (private method)", () => {
    it("should generate output from provided content", async () => {
      const content = "# {{title}}\n{{description}}";

      const result = await pageParser["generateOutputContent"](content, {
        title: "Test",
        description: "Description",
      });

      expect(mockEngine.render).toHaveBeenCalledWith(content, {
        title: "Test",
        description: "Description",
      });
      expect(result).toBe("Rendered content");
      expect(mockFs.readFile).not.toHaveBeenCalled(); // Should not read from filesystem
    });

    it("should handle rendering errors", async () => {
      mockEngine.render.mockImplementation(() => {
        throw new Error("Render error");
      });

      await expect(
        pageParser["generateOutputContent"]("{{title}}", { title: "Test" }),
      ).rejects.toThrow("Render error");
    });
  });

  describe("helper methods", () => {
    describe("_applyCascadeInheritance", () => {
      it("should apply inheritance correctly", () => {
        const configs = [
          { title: "Base", description: "Base desc" },
          { title: "Child", inheritFrom: [0] },
        ];
        const defaults = { language: "en" };

        const result = pageParser["_applyCascadeInheritance"](configs, defaults, 1);

        expect(result.title).toBe("Child");
        expect(result.description).toBe("Base desc");
        expect(result.language).toBe("en");
      });

      it("should throw error for invalid current index", () => {
        const configs = [{ title: "Test" }];

        expect(() => pageParser["_applyCascadeInheritance"](configs, {}, 5)).toThrow(
          "Invalid currentIndex 5 for inheritance",
        );

        expect(() => pageParser["_applyCascadeInheritance"](configs, {}, -1)).toThrow(
          "Invalid currentIndex -1 for inheritance",
        );
      });

      it("should throw error for invalid inheritFrom index", () => {
        const configs = [{ title: "Base" }, { title: "Child", inheritFrom: [5] }];

        expect(() => pageParser["_applyCascadeInheritance"](configs, {}, 1)).toThrow(
          "Invalid inheritFrom index 5 in item at index 1",
        );
      });

      it("should handle multiple inheritance sources", () => {
        const configs = [
          { title: "Base1", description: "Base1 desc" },
          { title: "Base2", keywords: ["base2"] },
          { title: "Child", inheritFrom: [0, 1], tags: ["child"] },
        ];

        const result = pageParser["_applyCascadeInheritance"](configs, {}, 2);

        expect(result.title).toBe("Child");
        expect(result.description).toBe("Base1 desc");
        expect(result.keywords).toEqual(["base2"]);
        expect(result.tags).toEqual(["child"]);
      });

      it("should handle configs without inheritFrom", () => {
        const configs = [{ title: "Standalone" }];
        const defaults = { language: "en" };

        const result = pageParser["_applyCascadeInheritance"](configs, defaults, 0);

        expect(result.title).toBe("Standalone");
        expect(result.language).toBe("en");
      });
    });

    describe("_prepareBuildVariables", () => {
      it("should prepare build variables without external variables", async () => {
        const config = { title: "Test", description: "Desc" };

        const result = await pageParser["_prepareBuildVariables"](config as PageConfig);

        expect(result.title).toBe("Test");
        expect(result.description).toBe("Desc");
        expect(mockBuildVariablesLoader.load).not.toHaveBeenCalled();
      });

      it("should load external build variables", async () => {
        mockBuildVariablesLoader.load.mockResolvedValue({ external: "data" });
        const config = {
          title: "Test",
          extension: "md",
          buildVariables: {
            config: "config.json",
            data: "data.yaml",
          },
        };

        const result = await pageParser["_prepareBuildVariables"](config as PageConfig);

        expect(mockBuildVariablesLoader.load).toHaveBeenCalledWith("config.json");
        expect(mockBuildVariablesLoader.load).toHaveBeenCalledWith("data.yaml");
        expect(result.config).toEqual({ external: "data" });
        expect(result.data).toEqual({ external: "data" });
      });
    });

    describe("_getPageLanguage", () => {
      it("should return config language when specified", () => {
        const config = { language: "es" } as PageConfig;
        const result = pageParser["_getPageLanguage"](config, "en");
        expect(result).toBe("es");
      });

      it("should return default language when not specified", () => {
        const config = {} as PageConfig;
        const result = pageParser["_getPageLanguage"](config, "fr");
        expect(result).toBe("fr");
      });
    });

    describe("_getSourceFileName", () => {
      it("should generate filename for default language", () => {
        const result = pageParser["_getSourceFileName"]("test", "md", "en", "en");
        expect(result).toBe("test.md");
      });

      it("should generate filename for non-default language", () => {
        const result = pageParser["_getSourceFileName"]("test", "md", "es", "en");
        expect(result).toBe("test.es.md");
      });

      it("should handle extension with dot", () => {
        const result = pageParser["_getSourceFileName"]("test", ".html", "en", "en");
        expect(result).toBe("test.html");
      });

      it("should handle nested paths", () => {
        const result = pageParser["_getSourceFileName"]("docs/guide", "md", "fr", "en");
        expect(result).toBe("docs/guide.fr.md");
      });
    });

    describe("_generateOutputPath", () => {
      it("should generate paths for default language", () => {
        const result = pageParser["_generateOutputPath"]("test", "md");

        expect(result).toBe("/project/dist/test.md");
      });

      it("should generate paths for non-default language", () => {
        const relName = mockProjectConfig.locale.toSlug({
          language: "es",
          defaultLanguage: "en",
          pageConfig: {},
          slug: "test",
        });
        const result = pageParser["_generateOutputPath"](relName, "md");

        expect(result).toBe("/project/dist/es/test.md");
      });

      it("should handle different extensions", () => {
        const result = pageParser["_generateOutputPath"]("test", "html");

        expect(result).toBe("/project/dist/test.html");
      });

      it("should use project config output root", () => {
        pageParser["projectConfig"].outputRoot = "build";
        const result = pageParser["_generateOutputPath"]("test", "md");

        expect(result).toBe("/project/build/test.md");
      });
    });
  });

  describe("loadYaml (private method)", () => {
    it("should load and parse YAML file", async () => {
      const yamlContent = "title: Test\ndescription: Test desc";
      mockFs.readFile.mockResolvedValue(yamlContent);
      mockYaml.parseAllDocuments.mockReturnValue([
        { toJSON: () => ({ title: "Test", description: "Test desc" }) },
      ] as any);

      const result = await pageParser["loadYaml"]("/path/to/file.yaml");

      expect(mockFs.readFile).toHaveBeenCalledWith("/path/to/file.yaml", "utf-8");
      expect(mockYaml.parseAllDocuments).toHaveBeenCalledWith(yamlContent);
      expect(result).toEqual([{ title: "Test", description: "Test desc" }]);
    });

    it("should handle file read errors", async () => {
      const error = new Error("File not found");
      mockFs.readFile.mockRejectedValue(error);

      await expect(pageParser["loadYaml"]("/missing.yaml")).rejects.toThrow(FileFetchError);
    });

    it("should handle YAML parse errors", async () => {
      mockFs.readFile.mockResolvedValue("invalid: yaml: content");
      const error = new Error("Parse error");
      mockYaml.parseAllDocuments.mockImplementation(() => {
        throw error;
      });

      await expect(pageParser["loadYaml"]("/invalid.yaml")).rejects.toThrow(ParseError);
    });

    it("should handle documents that return null from toJSON", async () => {
      mockFs.readFile.mockResolvedValue("---\n---");
      mockYaml.parseAllDocuments.mockReturnValue([
        { toJSON: () => null },
        { toJSON: () => ({ title: "Valid" }) },
      ] as any);

      const result = await pageParser["loadYaml"]("/mixed.yaml");

      expect(result).toEqual([{}, { title: "Valid" }]);
    });

    it("should handle empty document array", async () => {
      mockFs.readFile.mockResolvedValue("");
      mockYaml.parseAllDocuments.mockReturnValue([]);

      const result = await pageParser["loadYaml"]("/empty.yaml");

      expect(result).toEqual([]);
    });
  });

  describe("path helper methods", () => {
    it("should get project root from renderer", () => {
      const result = pageParser["getProjectRoot"]();
      expect(result).toBe("/project");
    });

    it("should get scan root from renderer", () => {
      const result = pageParser["getProjectScanRoot"]();
      expect(result).toBe("/project/src");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty configurations array", async () => {
      const results = await pageParser["processPageConfigurations"]([], "empty");
      expect(results).toEqual([]);
    });

    it("should handle configuration with no title", async () => {
      const configs = [{ output: true }];
      const results = await pageParser["processPageConfigurations"](configs, "no-title");

      expect(results[0].success).toBe(true);
      expect(results[0].title).toBe("Default Title"); // From project defaults
    });

    it("should handle long file paths", async () => {
      const longPath = "very/deeply/nested/directory/structure/with/many/levels/document";
      const configs = [{ title: "Deep", output: true }];

      const results = await pageParser["processPageConfigurations"](configs, longPath);

      expect(results[0].sourcePath).toBe(`/project/src/${longPath}.md`);
      expect(results[0].outputPath).toBe(`/project/dist/${longPath}.md`);
    });

    it("should handle special characters in file names", async () => {
      const specialPath = "docs/特殊文档-español_français.测试";
      const configs = [{ title: "Special", output: true }];

      const results = await pageParser["processPageConfigurations"](configs, specialPath);

      expect(results[0].sourcePath).toBe(`/project/src/${specialPath}.md`);
    });

    it("should handle very large number of configurations", async () => {
      const configs = Array.from({ length: 1000 }, (_, i) => ({
        title: `Page ${i}`,
        output: i % 10 === 0, // Only output every 10th page
      }));

      const results = await pageParser["processPageConfigurations"](configs, "bulk");

      expect(results).toHaveLength(100);
      // All results should have outputPath, but only 100 should have had files actually written
      expect(results.every((r) => r.outputPath)).toBe(true);
      expect(mockEngine.render).toHaveBeenCalledTimes(100); // Only called for output: true pages
    });

    it("should handle partial loading errors gracefully", async () => {
      const configs = [{ title: "Test Page" }];

      // Mock the engine to throw an error during partial registration
      mockEngine.registerPartialsFromDirectory.mockRejectedValue(
        new Error("Partial loading failed"),
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(pageParser["processPageConfigurations"](configs, "test")).rejects.toThrow(
        "Partial loading failed",
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load partials from directory:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("edge cases and branch coverage", () => {
    it("should handle configuration with empty extension property", async () => {
      const configs = [
        {
          title: "Test",
          extension: "", // This should trigger the extension || 'md' branch
        },
      ];

      const result = await pageParser.processConfigurations(configs, "test-source.yaml");
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle configurations with undefined extension", async () => {
      const configs = [
        {
          title: "Test",
          // extension is undefined, should use default 'md'
        },
      ];

      const result = await pageParser.processConfigurations(configs, "test-source.yaml");
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle languages correctly for extension defaulting", async () => {
      const configs = [
        {
          title: "Language Test",
          language: "es", // Non-default language
        },
      ];

      const result = await pageParser.processConfigurations(configs, "language-source.yaml");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("metadata generation with different configurations", () => {
    it("should write metadata file when kind=file", async () => {
      mockProjectConfig.metadata = { enabled: true, kind: "file" };
      const pageParser = new PageParser(
        mockEngine,
        mockBuildVariablesLoader,
        mockProjectConfig,
        mockRenderer.paths,
      );

      const configs = [{ title: "Test Page", output: true }];
      await pageParser.processConfigurations(configs, "test", "# Test");

      const metadataWriteCalls = mockFs.writeFile.mock.calls.filter((call) =>
        call[0].includes(".metadata.json"),
      );
      expect(metadataWriteCalls.length).toBeGreaterThan(0);
    });

    it("should not write metadata file when disabled", async () => {
      mockProjectConfig.metadata = { enabled: false };
      const pageParser = new PageParser(
        mockEngine,
        mockBuildVariablesLoader,
        mockProjectConfig,
        mockRenderer.paths,
      );

      const configs = [{ title: "Test Page", output: true }];
      await pageParser.processConfigurations(configs, "test", "# Test");

      const metadataWriteCalls = mockFs.writeFile.mock.calls.filter((call) =>
        call[0].includes(".metadata.json"),
      );
      expect(metadataWriteCalls.length).toBe(0);
    });

    it("should prepend YAML metadata when kind=prepend", async () => {
      mockProjectConfig.metadata = { enabled: true, kind: "prepend" };
      const pageParser = new PageParser(
        mockEngine,
        mockBuildVariablesLoader,
        mockProjectConfig,
        mockRenderer.paths,
      );

      const configs = [{ title: "Test Page", output: true }];
      await pageParser.processConfigurations(configs, "test", "# Test Content");

      const outputWriteCall = mockFs.writeFile.mock.calls.find(
        (call) => !call[0].includes(".metadata.json"),
      );
      expect(outputWriteCall).toBeDefined();
      const outputContent = outputWriteCall![1] as string;
      expect(outputContent).toContain("---");
      expect(outputContent).toContain("title:");
    });

    it("should prepend JSON metadata when kind=prepend and format=json", async () => {
      mockProjectConfig.metadata = {
        enabled: true,
        kind: "prepend",
        prepend: { format: "json" },
      };
      const pageParser = new PageParser(
        mockEngine,
        mockBuildVariablesLoader,
        mockProjectConfig,
        mockRenderer.paths,
      );

      const configs = [{ title: "Test Page", output: true }];
      await pageParser.processConfigurations(configs, "test", "# Test Content");

      const outputWriteCall = mockFs.writeFile.mock.calls.find(
        (call) => !call[0].includes(".metadata.json"),
      );
      expect(outputWriteCall).toBeDefined();
      const outputContent = outputWriteCall![1] as string;
      expect(outputContent).toContain("---");
      expect(outputContent).toContain('"title"');
    });

    it("should use custom separator when provided", async () => {
      mockProjectConfig.metadata = {
        enabled: true,
        kind: "prepend",
        prepend: { separator: "+++" },
      };
      const pageParser = new PageParser(
        mockEngine,
        mockBuildVariablesLoader,
        mockProjectConfig,
        mockRenderer.paths,
      );

      const configs = [{ title: "Test Page", output: true }];
      await pageParser.processConfigurations(configs, "test", "# Test Content");

      const outputWriteCall = mockFs.writeFile.mock.calls.find(
        (call) => !call[0].includes(".metadata.json"),
      );
      expect(outputWriteCall).toBeDefined();
      const outputContent = outputWriteCall![1] as string;
      expect(outputContent).toContain("+++");
    });

    it("should not include metadataPath in results when metadata is disabled", async () => {
      mockProjectConfig.metadata = { enabled: false };
      const pageParser = new PageParser(
        mockEngine,
        mockBuildVariablesLoader,
        mockProjectConfig,
        mockRenderer.paths,
      );

      const configs = [{ title: "Test Page", output: true }];
      const results = await pageParser.processConfigurations(configs, "test", "# Test");

      expect(results[0].metadataPath).toBeUndefined();
    });

    it("should include metadataPath in results when kind=file", async () => {
      mockProjectConfig.metadata = { enabled: true, kind: "file" };
      const pageParser = new PageParser(
        mockEngine,
        mockBuildVariablesLoader,
        mockProjectConfig,
        mockRenderer.paths,
      );

      const configs = [{ title: "Test Page", output: true }];
      const results = await pageParser.processConfigurations(configs, "test", "# Test");

      expect(results[0].metadataPath).toBeDefined();
      expect(results[0].metadataPath).toContain(".metadata.json");
    });
  });
});
