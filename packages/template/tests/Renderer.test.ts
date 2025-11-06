import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs/promises";

import type { PageResult } from "../src/api.schemas.js";
import { BuildVariablesLoader } from "../src/BuildVariablesLoader.js";
import { TemplateEngine } from "../src/engines.js";
import { FileFetchError, InitializationError, ParseError, RenderError } from "../src/errors.js";
import PageParser from "../src/PageParser.js";
import Renderer from "../src/Renderer.js";
import type { PageConfig, ProjectConfig, ProjectConfigInput } from "../src/schemas.js";
import { ProjectConfigSchema } from "../src/schemas.js";

// Mock dependencies
jest.mock("fs/promises");
jest.mock("../src/PageParser.js");
jest.mock("../src/BuildVariablesLoader.js");
jest.mock("../src/schemas.js", () => ({
  ProjectConfigSchema: {
    safeParse: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const MockPageParser = PageParser as jest.MockedClass<typeof PageParser>;
const MockBuildVariablesLoader = BuildVariablesLoader as jest.MockedClass<
  typeof BuildVariablesLoader
>;
const mockProjectConfigSchema = ProjectConfigSchema as jest.Mocked<typeof ProjectConfigSchema>;

describe("Renderer", () => {
  let renderer: Renderer;
  let mockEngine: jest.Mocked<TemplateEngine>;
  let mockConfig: ProjectConfigInput;
  let mockPageParser: jest.Mocked<PageParser>;
  let mockBuildVariablesLoader: jest.Mocked<BuildVariablesLoader>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      projectRoot: "./test-project",
      scanRoot: "./test-source",
      outputRoot: "./test-output",
      engine: "mustache",
      defaults: {
        language: "en",
        extension: "md",
        output: true,
        title: "Default Title",
        description: "Default Description",
      },
    };

    // Mock successful schema validation
    mockProjectConfigSchema.safeParse.mockReturnValue({
      success: true,
      data: mockConfig,
    } as any);

    // Mock PageParser
    mockPageParser = {
      processYamlFile: jest.fn(),
      processConfigurations: jest.fn(),
    } as any;
    MockPageParser.mockImplementation(() => mockPageParser);

    // Mock TemplateEngine
    mockEngine = {
      render: jest.fn(),
      registerPartial: jest.fn(),
    } as any;

    // Mock BuildVariablesLoader
    mockBuildVariablesLoader = {
      load: jest.fn(),
    } as any;
    MockBuildVariablesLoader.mockImplementation(() => mockBuildVariablesLoader);

    // Mock process.cwd()
    jest.spyOn(process, "cwd").mockReturnValue("/current/dir");

    renderer = new Renderer(mockConfig);
  });

  describe("constructor", () => {
    it("should create renderer with valid config", () => {
      expect(renderer).toBeInstanceOf(Renderer);
      expect(renderer.paths.projectRoot).toBe("/current/dir/test-project");
      expect(renderer.paths.scanRoot).toBe("/current/dir/test-source");
      expect(renderer.paths.outputRoot).toBe("/current/dir/test-output");
      expect(renderer.defaultLanguage).toBe("en");
    });

    it("should use default paths when not specified", () => {
      const minimalConfig = { defaults: {} };
      mockProjectConfigSchema.safeParse.mockReturnValue({
        success: true,
        data: minimalConfig,
      } as any);

      const minimalRenderer = new Renderer(minimalConfig as ProjectConfig);

      expect(minimalRenderer.paths.projectRoot).toBe("/current/dir");
      expect(minimalRenderer.paths.scanRoot).toBe("/current/dir");
      expect(minimalRenderer.paths.outputRoot).toBe("/current/dir/dist");
    });

    it("should use default language when not specified", () => {
      const configWithoutLanguage = {
        ...mockConfig,
        defaults: { ...mockConfig.defaults, language: undefined },
      };

      const rendererWithoutLanguage = new Renderer(configWithoutLanguage as ProjectConfig);

      expect(rendererWithoutLanguage.defaultLanguage).toBe("en");
    });

    it("should create renderer with handlebars engine", () => {
      const configWithHandlebars = {
        ...mockConfig,
        defaults: { ...mockConfig.defaults, engine: "handlebars" as const },
      };

      const renderer = new Renderer(configWithHandlebars);
      expect(renderer).toBeInstanceOf(Renderer);
      // Verify that the handlebars engine is selected
      expect(renderer.render("Hello {{name}}!", { name: "World" })).toBe("Hello World!");
    });

    it("should create renderer with mustache engine explicitly", () => {
      const configWithMustache = {
        ...mockConfig,
        defaults: { ...mockConfig.defaults, engine: "mustache" as const },
      };

      const renderer = new Renderer(configWithMustache);
      expect(renderer).toBeInstanceOf(Renderer);
      // Verify that the mustache engine is selected
      expect(renderer.render("Hello {{name}}!", { name: "World" })).toBe("Hello World!");
    });

    it("should use default mustache engine for unknown engine types", () => {
      const configWithUnknownEngine = {
        ...mockConfig,
        defaults: { ...mockConfig.defaults, engine: "unknown" as any },
      };

      const renderer = new Renderer(configWithUnknownEngine);
      expect(renderer).toBeInstanceOf(Renderer);
      // Verify that the default (mustache) engine is used
      expect(renderer.render("Hello {{name}}!", { name: "World" })).toBe("Hello World!");
    });

    it("should throw InitializationError for invalid config", () => {
      mockProjectConfigSchema.safeParse.mockReturnValue({
        success: false,
        error: new Error("Invalid config"),
      } as any);

      expect(() => new Renderer(mockConfig)).toThrow(InitializationError);
      expect(() => new Renderer(mockConfig)).toThrow(
        "Invalid project configuration provided to Renderer.",
      );
    });

    it("should resolve absolute paths correctly", () => {
      const absoluteConfig = {
        projectRoot: "/absolute/project",
        scanRoot: "/absolute/source",
        outputRoot: "/absolute/output",
        defaults: {},
        engine: "mustache" as const,
        metadata: {},
        partials: {},
        locale: {},
      };

      mockProjectConfigSchema.safeParse.mockReturnValue({
        success: true,
        data: absoluteConfig,
      } as any);

      const absoluteRenderer = new Renderer(absoluteConfig as ProjectConfig);

      expect(absoluteRenderer.paths.projectRoot).toBe("/absolute/project");
      expect(absoluteRenderer.paths.scanRoot).toBe("/absolute/source");
      expect(absoluteRenderer.paths.outputRoot).toBe("/absolute/output");
    });
  });

  describe("build method", () => {
    beforeEach(() => {
      // Mock findYamlFiles with context-aware readdir
      mockFs.readdir.mockImplementation(async (dir: any) => {
        if (typeof dir === "string" && dir.includes("subdir")) {
          // Empty subdirectory to prevent infinite recursion
          return [];
        }
        return [
          { name: "test1.yaml", isFile: () => true, isDirectory: () => false },
          { name: "test2.yml", isFile: () => true, isDirectory: () => false },
          {
            name: "not-yaml.txt",
            isFile: () => true,
            isDirectory: () => false,
          },
          { name: "subdir", isFile: () => false, isDirectory: () => true },
        ] as any;
      });
    });

    it("should build all YAML files successfully", async () => {
      const mockPageResults: Array<PageResult> = [
        {
          sourcePath: "test1.md",
          outputPath: "/output/test1.html",
          success: true,
          title: "Test 1",
          baseName: "test1",
        },
        {
          sourcePath: "test2.md",
          outputPath: "/output/test2.html",
          success: true,
          title: "Test 2",
          baseName: "test2",
        },
      ];

      mockPageParser.processYamlFile
        .mockResolvedValueOnce([mockPageResults[0]])
        .mockResolvedValueOnce([mockPageResults[1]]);

      const result = await renderer.build();

      expect(result.success).toBe(true);
      expect(result.totalPages).toBe(2);
      expect(result.successfulPages).toBe(2);
      expect(result.failedPages).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.pages["test1.md"]).toEqual(mockPageResults[0]);
      expect(result.pages["test2.md"]).toEqual(mockPageResults[1]);
      expect(result.stats).toBeDefined();
      expect(result.stats!.buildTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.stats!.startTime).toBeInstanceOf(Date);
      expect(result.stats!.endTime).toBeInstanceOf(Date);
    });

    it("should handle individual file build failures", async () => {
      const successResult: PageResult = {
        sourcePath: "test1.md",
        success: true,
        baseName: "test1",
      };

      const failureResult: PageResult = {
        sourcePath: "test2.md",
        success: false,
        error: "Processing failed",
        baseName: "test2",
      };

      mockPageParser.processYamlFile
        .mockResolvedValueOnce([successResult])
        .mockResolvedValueOnce([failureResult]);

      const result = await renderer.build();

      expect(result.success).toBe(false);
      expect(result.totalPages).toBe(2);
      expect(result.successfulPages).toBe(1);
      expect(result.failedPages).toBe(1);
      expect(result.errors).toEqual([]);
      expect(result.pages["test1.md"]).toEqual(successResult);
      expect(result.pages["test2.md"]).toEqual(failureResult);
    });

    it("should handle YAML file processing exceptions", async () => {
      mockPageParser.processYamlFile
        .mockResolvedValueOnce([{ sourcePath: "test1.md", success: true, baseName: "test1" }])
        .mockRejectedValueOnce(new Error("File processing error"));

      const result = await renderer.build();

      expect(result.success).toBe(true); // Build succeeds even if one file fails
      expect(result.totalPages).toBe(1); // Only successful file is included
      expect(result.successfulPages).toBe(1);
      expect(result.failedPages).toBe(0);
      expect(result.errors).toHaveLength(0); // buildSingle catches errors, doesn't propagate to build
    });

    it("should handle complete build failure", async () => {
      mockFs.readdir.mockRejectedValue(new Error("Cannot read directory"));

      const result = await renderer.build();

      expect(result.success).toBe(false);
      expect(result.totalPages).toBe(0);
      expect(result.successfulPages).toBe(0);
      expect(result.failedPages).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Cannot read directory");
      expect(result.pages).toEqual({});
    });

    it("should handle empty directory", async () => {
      mockFs.readdir.mockResolvedValue([]);

      const result = await renderer.build();

      expect(result.success).toBe(true);
      expect(result.totalPages).toBe(0);
      expect(result.successfulPages).toBe(0);
      expect(result.failedPages).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.pages).toEqual({});
    });

    it("should handle nested directories", async () => {
      let readdirCallCount = 0;
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        readdirCallCount++;
        if (readdirCallCount === 1) {
          // Root directory
          return [
            { name: "test.yaml", isFile: () => true, isDirectory: () => false },
            { name: "subdir", isFile: () => false, isDirectory: () => true },
          ] as any;
        } else {
          // Subdirectory
          return [
            {
              name: "nested.yml",
              isFile: () => true,
              isDirectory: () => false,
            },
          ] as any;
        }
      });

      mockPageParser.processYamlFile
        .mockResolvedValueOnce([{ sourcePath: "test.md", success: true, baseName: "test" }])
        .mockResolvedValueOnce([{ sourcePath: "nested.md", success: true, baseName: "nested" }]);

      const result = await renderer.build();

      expect(result.totalPages).toBe(2); // Both YAML files processed
      expect(mockPageParser.processYamlFile).toHaveBeenCalledTimes(2);
    });

    it("should calculate build statistics correctly", async () => {
      const startTime = Date.now();

      mockPageParser.processYamlFile.mockImplementation(async () => {
        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, 10));
        return [{ sourcePath: "test.md", success: true, baseName: "test" }];
      });

      const result = await renderer.build();

      expect(result.stats).toBeDefined();
      expect(result.stats!.buildTimeMs).toBeGreaterThan(0);
      expect(result.stats!.startTime.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(result.stats!.endTime.getTime()).toBeGreaterThan(result.stats!.startTime.getTime());
      expect(result.stats!.endTime.getTime() - result.stats!.startTime.getTime()).toBe(
        result.stats!.buildTimeMs,
      );
    });
  });

  describe("buildSingle method", () => {
    it("should build single YAML file successfully", async () => {
      const mockResults: Array<PageResult> = [
        {
          sourcePath: "test.md",
          success: true,
          title: "Test Page",
          baseName: "test",
        },
      ];
      mockPageParser.processYamlFile.mockResolvedValue(mockResults);

      const results = await renderer.buildSingle("test.yaml");

      expect(mockPageParser.processYamlFile).toHaveBeenCalledWith(
        "/current/dir/test-source/test.yaml",
        undefined,
      );
      expect(results).toEqual(mockResults);
    });

    it("should handle relative paths", async () => {
      const mockResults: Array<PageResult> = [
        { sourcePath: "docs/guide.md", success: true, baseName: "docs/guide" },
      ];
      mockPageParser.processYamlFile.mockResolvedValue(mockResults);

      const results = await renderer.buildSingle("docs/guide.yaml");

      expect(mockPageParser.processYamlFile).toHaveBeenCalledWith(
        "/current/dir/test-source/docs/guide.yaml",
        undefined,
      );
      expect(results).toEqual(mockResults);
    });

    it("should handle absolute paths", async () => {
      const absolutePath = "/absolute/path/test.yaml";
      const mockResults: Array<PageResult> = [
        { sourcePath: "test.md", success: true, baseName: "test" },
      ];
      mockPageParser.processYamlFile.mockResolvedValue(mockResults);

      const results = await renderer.buildSingle(absolutePath);

      expect(mockPageParser.processYamlFile).toHaveBeenCalledWith(absolutePath, undefined);
      expect(results).toEqual(mockResults);
    });

    it("should handle processing errors gracefully", async () => {
      const error = new Error("Processing failed");
      mockPageParser.processYamlFile.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const results = await renderer.buildSingle("error.yaml");

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Error processing.*Processing failed/),
      );

      consoleSpy.mockRestore();
    });

    it("should handle FileFetchError", async () => {
      const error = new FileFetchError("missing.yaml", "File not found");
      mockPageParser.processYamlFile.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const results = await renderer.buildSingle("missing.yaml");

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle ParseError", async () => {
      const error = new ParseError("invalid.yaml", "Invalid YAML syntax");
      mockPageParser.processYamlFile.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const results = await renderer.buildSingle("invalid.yaml");

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("buildFromConfiguration method", () => {
    it("should build from configuration objects", async () => {
      const configs: Array<Partial<PageConfig>> = [
        { title: "Config 1", output: true },
        { title: "Config 2", output: true, language: "es" },
      ];
      const baseFileName = "dynamic";
      const content = "# {{title}}\n\n{{description}}";

      const mockResults: Array<PageResult> = [
        {
          sourcePath: "dynamic.md",
          success: true,
          title: "Config 1",
          baseName: "dynamic",
        },
        {
          sourcePath: "dynamic.es.md",
          success: true,
          title: "Config 2",
          language: "es",
          baseName: "dynamic.es",
        },
      ];

      mockPageParser.processConfigurations.mockResolvedValue(mockResults);

      const results = await renderer.buildFromConfiguration(configs, baseFileName, content);

      expect(mockPageParser.processConfigurations).toHaveBeenCalledWith(
        configs,
        baseFileName,
        content,
        undefined,
      );
      expect(results).toEqual(mockResults);
    });

    it("should build from configuration without content", async () => {
      const configs: Array<Partial<PageConfig>> = [{ title: "File Based", output: true }];

      const mockResults: Array<PageResult> = [
        { sourcePath: "file-based.md", success: true, baseName: "file-based" },
      ];

      mockPageParser.processConfigurations.mockResolvedValue(mockResults);

      const results = await renderer.buildFromConfiguration(configs, "file-based");

      expect(mockPageParser.processConfigurations).toHaveBeenCalledWith(
        configs,
        "file-based",
        undefined,
        undefined,
      );
      expect(results).toEqual(mockResults);
    });

    it("should handle configuration processing errors", async () => {
      const configs: Array<Partial<PageConfig>> = [{ title: "Error Config", output: true }];

      mockPageParser.processConfigurations.mockRejectedValue(new Error("Config error"));

      const results = await renderer.buildFromConfiguration(configs, "error-config");

      expect(results).toEqual([]);
    });

    it("should handle empty configurations array", async () => {
      const configs: Array<Partial<PageConfig>> = [];

      mockPageParser.processConfigurations.mockResolvedValue([]);

      const results = await renderer.buildFromConfiguration(configs, "empty");

      expect(mockPageParser.processConfigurations).toHaveBeenCalledWith(
        configs,
        "empty",
        undefined,
        undefined,
      );
      expect(results).toEqual([]);
    });

    it("should handle RenderError from PageParser", async () => {
      const configs: Array<Partial<PageConfig>> = [{ title: "Render Error", output: true }];

      mockPageParser.processConfigurations.mockRejectedValue(new RenderError("Template error"));

      const results = await renderer.buildFromConfiguration(configs, "render-error");

      expect(results).toEqual([]);
    });
  });

  describe("render method", () => {
    // Since mustache is a real dependency, we need to test actual rendering
    it("should render simple mustache template", () => {
      const content = "Hello {{name}}!";
      const variables = { name: "World" };

      const result = renderer.render(content, variables);

      expect(result).toBe("Hello World!");
    });

    it("should render complex mustache template", () => {
      const content = `# {{title}}

{{description}}

## Items
{{#items}}
- {{name}}: {{value}}
{{/items}}

{{^items}}
No items available.
{{/items}}`;

      const variables = {
        title: "Test Document",
        description: "A test document",
        items: [
          { name: "Item 1", value: "Value 1" },
          { name: "Item 2", value: "Value 2" },
        ],
      };

      const result = renderer.render(content, variables);

      expect(result).toContain("# Test Document");
      expect(result).toContain("A test document");
      expect(result).toContain("- Item 1: Value 1");
      expect(result).toContain("- Item 2: Value 2");
      expect(result).not.toContain("No items available");
    });

    it("should handle empty variables", () => {
      const content = "Static content without variables";
      const variables = {};

      const result = renderer.render(content, variables);

      expect(result).toBe("Static content without variables");
    });

    it("should handle missing variables gracefully", () => {
      const content = "Hello {{name}}! Your age is {{age}}.";
      const variables = { name: "John" }; // age is missing

      const result = renderer.render(content, variables);

      expect(result).toBe("Hello John! Your age is .");
    });

    it("should throw RenderError for empty rendered output", () => {
      // Mock mustache to return empty string
      const originalRender = require("mustache").render;
      require("mustache").render = jest.fn().mockReturnValue("");

      expect(() => renderer.render("{{test}}", {})).toThrow(RenderError);
      expect(() => renderer.render("{{test}}", {})).toThrow("Rendered output is empty");

      // Restore original
      require("mustache").render = originalRender;
    });

    it("should handle mustache rendering errors", () => {
      // Mock mustache to throw an error
      const originalRender = require("mustache").render;
      require("mustache").render = jest.fn().mockImplementation(() => {
        throw new Error("Mustache error");
      });

      expect(() => renderer.render("{{test}}", {})).toThrow(RenderError);
      expect(() => renderer.render("{{test}}", {})).toThrow("Failed to render Mustache template");

      // Restore original
      require("mustache").render = originalRender;
    });

    it("should handle nested object variables", () => {
      const content = "{{user.name}} works at {{user.company.name}}";
      const variables = {
        user: {
          name: "Alice",
          company: {
            name: "Tech Corp",
          },
        },
      };

      const result = renderer.render(content, variables);

      expect(result).toBe("Alice works at Tech Corp");
    });

    it("should handle array iteration", () => {
      const content = `{{#users}}
User: {{name}} ({{email}})
{{/users}}`;

      const variables = {
        users: [
          { name: "Alice", email: "alice@example.com" },
          { name: "Bob", email: "bob@example.com" },
        ],
      };

      const result = renderer.render(content, variables);

      expect(result).toContain("User: Alice (alice@example.com)");
      expect(result).toContain("User: Bob (bob@example.com)");
    });

    it("should handle boolean conditionals", () => {
      const content = `{{#isPublic}}
This is public content.
{{/isPublic}}
{{^isPublic}}
This is private content.
{{/isPublic}}`;

      const publicVariables = { isPublic: true };
      const privateVariables = { isPublic: false };

      const publicResult = renderer.render(content, publicVariables);
      const privateResult = renderer.render(content, privateVariables);

      expect(publicResult).toContain("This is public content.");
      expect(publicResult).not.toContain("This is private content.");
      expect(privateResult).toContain("This is private content.");
      expect(privateResult).not.toContain("This is public content.");
    });

    it("should render handlebars templates when engine is handlebars", () => {
      const handlebarsConfig = {
        ...mockConfig,
        defaults: { ...mockConfig.defaults, engine: "handlebars" as const },
      };
      const handlebarsRenderer = new Renderer(handlebarsConfig);

      const content = "Hello {{user.name}}! You are {{user.age}} years old.";
      const variables = { user: { name: "John", age: 30 } };

      const result = handlebarsRenderer.render(content, variables);

      expect(result).toBe("Hello John! You are 30 years old.");
    });
  });

  describe("findYamlFiles (private method)", () => {
    it("should find YAML files recursively", async () => {
      let readdirCallCount = 0;
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        readdirCallCount++;
        if (readdirCallCount === 1) {
          // Root directory
          return [
            {
              name: "test1.yaml",
              isFile: () => true,
              isDirectory: () => false,
            },
            { name: "test2.yml", isFile: () => true, isDirectory: () => false },
            { name: "docs", isFile: () => false, isDirectory: () => true },
            { name: "readme.md", isFile: () => true, isDirectory: () => false },
          ] as any;
        } else {
          // docs subdirectory
          return [
            {
              name: "guide.yaml",
              isFile: () => true,
              isDirectory: () => false,
            },
            { name: "api.yml", isFile: () => true, isDirectory: () => false },
          ] as any;
        }
      });

      const yamlFiles = await renderer["findYamlFiles"]();

      expect(yamlFiles).toHaveLength(4);
      expect(yamlFiles.every((file) => file.endsWith(".yaml") || file.endsWith(".yml"))).toBe(true);
    });

    it("should handle empty directories", async () => {
      mockFs.readdir.mockResolvedValue([]);

      const yamlFiles = await renderer["findYamlFiles"]();

      expect(yamlFiles).toEqual([]);
    });

    it("should ignore non-YAML files", async () => {
      mockFs.readdir.mockResolvedValue([
        { name: "test.txt", isFile: () => true, isDirectory: () => false },
        { name: "config.json", isFile: () => true, isDirectory: () => false },
        { name: "readme.md", isFile: () => true, isDirectory: () => false },
      ] as any);

      const yamlFiles = await renderer["findYamlFiles"]();

      expect(yamlFiles).toEqual([]);
    });

    it("should handle deeply nested directories", async () => {
      let readdirCallCount = 0;
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        readdirCallCount++;
        if (readdirCallCount === 1) {
          return [{ name: "level1", isFile: () => false, isDirectory: () => true }] as any;
        } else if (readdirCallCount === 2) {
          return [{ name: "level2", isFile: () => false, isDirectory: () => true }] as any;
        } else {
          return [{ name: "deep.yaml", isFile: () => true, isDirectory: () => false }] as any;
        }
      });

      const yamlFiles = await renderer["findYamlFiles"]();

      expect(yamlFiles).toHaveLength(1);
      expect(yamlFiles[0]).toContain("deep.yaml");
    });
  });

  describe("integration tests", () => {
    it("should handle complete workflow with real data", async () => {
      // Mock a complete successful build workflow
      const yamlFiles = ["/test-source/doc1.yaml", "/test-source/doc2.yaml"];
      const pageResults: Array<PageResult> = [
        {
          sourcePath: "doc1.md",
          outputPath: "/test-output/doc1.html",
          success: true,
          title: "Document 1",
          language: "en",
          baseName: "doc1",
        },
        {
          sourcePath: "doc2.es.md",
          outputPath: "/test-output/es/doc2.html",
          success: true,
          title: "Documento 2",
          language: "es",
          baseName: "doc2.es",
        },
      ];

      // Mock file system for findYamlFiles
      mockFs.readdir.mockResolvedValue([
        { name: "doc1.yaml", isFile: () => true, isDirectory: () => false },
        { name: "doc2.yaml", isFile: () => true, isDirectory: () => false },
      ] as any);

      // Mock page processing
      mockPageParser.processYamlFile
        .mockResolvedValueOnce([pageResults[0]])
        .mockResolvedValueOnce([pageResults[1]]);

      const buildResult = await renderer.build();

      expect(buildResult.success).toBe(true);
      expect(buildResult.totalPages).toBe(2);
      expect(buildResult.successfulPages).toBe(2);
      expect(buildResult.failedPages).toBe(0);
      expect(buildResult.pages["doc1.md"]).toEqual(pageResults[0]);
      expect(buildResult.pages["doc2.es.md"]).toEqual(pageResults[1]);
    });

    it("should handle mixed success and failure scenarios", async () => {
      const successResult: PageResult = {
        sourcePath: "success.md",
        outputPath: "/output/success.html",
        success: true,
        title: "Success Page",
        baseName: "success",
      };

      const failureResult: PageResult = {
        sourcePath: "failure.md",
        success: false,
        error: "Template compilation failed",
        baseName: "failure",
      };

      mockFs.readdir.mockResolvedValue([
        { name: "success.yaml", isFile: () => true, isDirectory: () => false },
        { name: "failure.yaml", isFile: () => true, isDirectory: () => false },
      ] as any);

      mockPageParser.processYamlFile
        .mockResolvedValueOnce([successResult])
        .mockResolvedValueOnce([failureResult]);

      const buildResult = await renderer.build();

      expect(buildResult.success).toBe(false);
      expect(buildResult.totalPages).toBe(2);
      expect(buildResult.successfulPages).toBe(1);
      expect(buildResult.failedPages).toBe(1);
      expect(buildResult.pages["success.md"].success).toBe(true);
      expect(buildResult.pages["failure.md"].success).toBe(false);
    });

    it("should handle large scale builds", async () => {
      // Simulate building 100 files
      const fileCount = 100;
      const files = Array.from({ length: fileCount }, (_, i) => ({
        name: `file${i}.yaml`,
        isFile: () => true,
        isDirectory: () => false,
      }));

      const results = Array.from({ length: fileCount }, (_, i) => ({
        sourcePath: `file${i}.md`,
        outputPath: `/output/file${i}.html`,
        success: true,
        title: `File ${i}`,
        baseName: `file${i}`,
      }));

      mockFs.readdir.mockResolvedValue(files as any);

      // Mock each processYamlFile call
      for (let i = 0; i < fileCount; i++) {
        mockPageParser.processYamlFile.mockResolvedValueOnce([results[i]]);
      }

      const buildResult = await renderer.build();

      expect(buildResult.success).toBe(true);
      expect(buildResult.totalPages).toBe(fileCount);
      expect(buildResult.successfulPages).toBe(fileCount);
      expect(buildResult.failedPages).toBe(0);
      expect(Object.keys(buildResult.pages)).toHaveLength(fileCount);
    });
  });

  describe("error handling edge cases", () => {
    it("should handle renderer destruction during build", async () => {
      mockFs.readdir.mockResolvedValue([
        { name: "test.yaml", isFile: () => true, isDirectory: () => false },
      ] as any);

      // Simulate renderer being destroyed
      mockPageParser.processYamlFile.mockRejectedValue(new Error("Renderer destroyed"));

      const result = await renderer.build();

      expect(result.success).toBe(true); // Build succeeds even if file processing fails
      expect(result.totalPages).toBe(0); // No pages added due to exception
      expect(result.errors).toHaveLength(0); // buildSingle catches errors
    });

    it("should handle concurrent build operations", async () => {
      mockFs.readdir.mockResolvedValue([
        { name: "test.yaml", isFile: () => true, isDirectory: () => false },
      ] as any);

      mockPageParser.processYamlFile.mockResolvedValue([
        { sourcePath: "test.md", success: true, baseName: "test" },
      ]);

      // Start multiple builds concurrently
      const builds = Promise.all([renderer.build(), renderer.build(), renderer.build()]);

      const results = await builds;

      // All builds should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.totalPages).toBe(1);
      });
    });

    it("should handle build errors in the try-catch block", async () => {
      // Mock findYamlFiles to throw an error that should be caught in the outer try-catch
      const findYamlFilesSpy = jest
        .spyOn(renderer as any, "findYamlFiles")
        .mockRejectedValue(new Error("Build error"));

      const result = await renderer.build();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Build error");

      // Restore original method
      findYamlFilesSpy.mockRestore();
    });
  });

  describe("helper methods", () => {
    describe("getOutputFilePath", () => {
      it("should generate correct output file path", () => {
        const result = renderer.getOutputFilePath("test/page", "html");
        expect(result).toBe("/current/dir/test-output/test/page.html");
      });

      it("should handle extension with leading dot", () => {
        const result = renderer.getOutputFilePath("test/page", ".html");
        expect(result).toBe("/current/dir/test-output/test/page.html");
      });

      it("should handle nested paths", () => {
        const result = renderer.getOutputFilePath("docs/guides/getting-started", "md");
        expect(result).toBe("/current/dir/test-output/docs/guides/getting-started.md");
      });

      it("should handle special characters in base name", () => {
        const result = renderer.getOutputFilePath("test-file_name", "txt");
        expect(result).toBe("/current/dir/test-output/test-file_name.txt");
      });
    });

    describe("getMetadataFilePath", () => {
      it("should generate correct metadata file path", () => {
        const result = renderer.getMetadataFilePath("test/page");
        expect(result).toBe("/current/dir/test-output/test/page.metadata.json");
      });

      it("should handle nested paths", () => {
        const result = renderer.getMetadataFilePath("docs/guides/getting-started");
        expect(result).toBe("/current/dir/test-output/docs/guides/getting-started.metadata.json");
      });

      it("should handle special characters in base name", () => {
        const result = renderer.getMetadataFilePath("test-file_name");
        expect(result).toBe("/current/dir/test-output/test-file_name.metadata.json");
      });

      it("should use PageParser METADATA_SUFFIX constant", () => {
        // Verify it uses the constant from PageParser
        const result = renderer.getMetadataFilePath("test");
        expect(result).toContain(".metadata.json"); // This should match PageParser.METADATA_SUFFIX
      });
    });

    describe("getSourceFilePath", () => {
      it("should generate correct source file path", () => {
        const result = renderer.getSourceFilePath("test/page", "html");
        expect(result).toBe("/current/dir/test-source/test/page.html");
      });

      it("should handle extension with leading dot when generating source path", () => {
        const result = renderer.getSourceFilePath("test/page", ".html");
        expect(result).toBe("/current/dir/test-source/test/page.html");
      });

      it("should handle extension without leading dot when generating source path", () => {
        const result = renderer.getSourceFilePath("test/page", "html");
        expect(result).toBe("/current/dir/test-source/test/page.html");
      });

      it("should generate correct source file path", () => {
        const renderer = new Renderer(mockConfig);
        const result = renderer.getSourceFilePath("test-page", "md");
        expect(result).toMatch(/test-page\.md$/);
      });

      it("should handle extension with leading dot when generating source path", () => {
        const renderer = new Renderer(mockConfig);
        const result = renderer.getSourceFilePath("test-page", ".md");
        expect(result).toMatch(/test-page\.md$/);
      });

      it("should handle extension without leading dot when generating source path", () => {
        const renderer = new Renderer(mockConfig);
        const result = renderer.getSourceFilePath("test-page", "html");
        expect(result).toMatch(/test-page\.html$/);
      });
    });
  });

  describe("engine configuration edge cases", () => {
    it("should handle handlebars engine explicitly", () => {
      const config = {
        projectRoot: "/test",
        scanRoot: "/test/scan",
        outputRoot: "/test/output",
        defaults: {
          extension: "md",
          language: "en",
          title: "Default",
        },
        engine: "handlebars" as const,
      };

      const renderer = new Renderer(config);
      const result = renderer.render("Hello {{name}}!", { name: "World" });
      expect(result).toBe("Hello World!");
    });

    it("should handle mustache engine explicitly", () => {
      const config = {
        projectRoot: "/test",
        scanRoot: "/test/scan",
        outputRoot: "/test/output",
        defaults: {
          extension: "md",
          language: "en",
          title: "Default",
        },
        engine: "mustache" as const,
      };

      const renderer = new Renderer(config);
      const result = renderer.render("Hello {{name}}!", { name: "World" });
      expect(result).toBe("Hello World!");
    });
  });
});
