import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs/promises";

import { MetadataGenerator } from "../src/MetadataGenerator.js";
import type { PageConfig, PageMetadata, ProjectConfig } from "../src/schemas.js";

// Mock fs
jest.mock("fs/promises");
const mockFs = fs as jest.Mocked<typeof fs>;

describe("MetadataGenerator", () => {
  let baseProjectConfig: ProjectConfig;
  let generator: MetadataGenerator;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    baseProjectConfig = {
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
      locale: {
        toSlug: ({ language, slug }) => `${language}/${slug}`,
      },
      metadata: {
        enabled: false,
      },
    };
  });

  const testPaths = { projectRoot: ".", outputRoot: "./dist" };

  describe("isEnabled", () => {
    it("should return false when metadata is disabled", () => {
      generator = new MetadataGenerator(baseProjectConfig);
      expect(generator.isEnabled()).toBe(false);
    });

    it("should return true when metadata is enabled", () => {
      baseProjectConfig.metadata = { enabled: true };
      generator = new MetadataGenerator(baseProjectConfig);
      expect(generator.isEnabled()).toBe(true);
    });

    it("should return false when metadata config is undefined", () => {
      const { metadata, ...configWithoutMetadata } = baseProjectConfig;
      generator = new MetadataGenerator(configWithoutMetadata as ProjectConfig);
      expect(generator.isEnabled()).toBe(false);
    });
  });

  describe("shouldWriteMetadataFile", () => {
    it("should return false when metadata is disabled", () => {
      baseProjectConfig.metadata = { enabled: false };
      generator = new MetadataGenerator(baseProjectConfig);
      expect(generator.shouldWriteMetadataFile()).toBe(false);
    });

    it("should return true when enabled with kind=file", () => {
      baseProjectConfig.metadata = { enabled: true, kind: "file" };
      generator = new MetadataGenerator(baseProjectConfig);
      expect(generator.shouldWriteMetadataFile()).toBe(true);
    });

    it("should return true when enabled without kind (defaults to file)", () => {
      baseProjectConfig.metadata = { enabled: true };
      generator = new MetadataGenerator(baseProjectConfig);
      expect(generator.shouldWriteMetadataFile()).toBe(true);
    });

    it("should return false when kind=prepend", () => {
      baseProjectConfig.metadata = { enabled: true, kind: "prepend" };
      generator = new MetadataGenerator(baseProjectConfig);
      expect(generator.shouldWriteMetadataFile()).toBe(false);
    });
  });

  describe("shouldPrependMetadata", () => {
    it("should return false when metadata is disabled", () => {
      baseProjectConfig.metadata = { enabled: false };
      generator = new MetadataGenerator(baseProjectConfig);
      expect(generator.shouldPrependMetadata()).toBe(false);
    });

    it("should return false when kind=file", () => {
      baseProjectConfig.metadata = { enabled: true, kind: "file" };
      generator = new MetadataGenerator(baseProjectConfig);
      expect(generator.shouldPrependMetadata()).toBe(false);
    });

    it("should return true when kind=prepend", () => {
      baseProjectConfig.metadata = { enabled: true, kind: "prepend" };
      generator = new MetadataGenerator(baseProjectConfig);
      expect(generator.shouldPrependMetadata()).toBe(true);
    });
  });

  describe("generateMetadataFile", () => {
    it("should generate JSON string with proper formatting", () => {
      generator = new MetadataGenerator(baseProjectConfig);
      const metadata: PageMetadata = {
        source: "src/test.md",
        metadataOutputPath: "dist/test.metadata.json",
        projectConfig: baseProjectConfig,
        title: "Test Page",
        description: "Test Description",
        language: "en",
      };

      const result = generator.generateMetadataFile(metadata);
      const parsed = JSON.parse(result);

      expect(parsed.title).toBe("Test Page");
      expect(parsed.description).toBe("Test Description");
      expect(parsed.source).toBe("src/test.md");
      expect(result).toContain("\n"); // Check for formatting
    });

    it("should include all metadata fields", () => {
      generator = new MetadataGenerator(baseProjectConfig);
      const metadata: PageMetadata = {
        source: "src/test.md",
        metadataOutputPath: "dist/test.metadata.json",
        projectConfig: baseProjectConfig,
        title: "Test Page",
        description: "Test Description",
        language: "en",
        keywords: ["test", "page"],
        tags: ["sample"],
        authors: [{ name: "John Doe", email: "john@example.com" }],
      };

      const result = generator.generateMetadataFile(metadata);
      const parsed = JSON.parse(result);

      expect(parsed.keywords).toEqual(["test", "page"]);
      expect(parsed.tags).toEqual(["sample"]);
      expect(parsed.authors).toEqual([{ name: "John Doe", email: "john@example.com" }]);
    });
  });

  describe("createMetadata", () => {
    it("should create metadata object with all required fields", () => {
      generator = new MetadataGenerator(baseProjectConfig);
      const pageConfig: PageConfig = {
        title: "Test Page",
        description: "Test Description",
        language: "en",
        output: true,
        extension: "md",
      };

      const metadata = generator.createMetadata(
        "src/test.md",
        "dist/test.metadata.json",
        pageConfig,
      );

      expect(metadata.source).toBe("src/test.md");
      expect(metadata.metadataOutputPath).toBe("dist/test.metadata.json");
      expect(metadata.title).toBe("Test Page");
      expect(metadata.description).toBe("Test Description");
      // locale is removed from metadata projectConfig
      const expectedConfig = { ...baseProjectConfig };
      delete expectedConfig.locale;
      delete expectedConfig.metadata;
      expect(metadata.projectConfig).toEqual(expectedConfig);
    });

    it("should spread all pageConfig properties into metadata", () => {
      generator = new MetadataGenerator(baseProjectConfig);
      const pageConfig: PageConfig = {
        title: "Test Page",
        description: "Test Description",
        language: "es",
        output: true,
        extension: "html",
        keywords: ["keyword1", "keyword2"],
        tags: ["tag1"],
        customProperty: "custom value",
      };

      const metadata = generator.createMetadata(
        "src/test.html",
        "dist/test.metadata.json",
        pageConfig,
      );

      expect(metadata.language).toBe("es");
      expect(metadata.keywords).toEqual(["keyword1", "keyword2"]);
      expect(metadata.tags).toEqual(["tag1"]);
      expect((metadata as any).customProperty).toBe("custom value");
    });
  });

  describe("prependMetadata", () => {
    it("should return content unchanged when kind is not prepend", () => {
      baseProjectConfig.metadata = { enabled: true, kind: "file" };
      generator = new MetadataGenerator(baseProjectConfig);

      const content = "# Test Content\n\nHello World";
      const metadata = { title: "Test" };

      const result = generator.prependMetadata(content, metadata);
      expect(result).toBe(content);
    });

    it("should prepend YAML metadata with default separator", () => {
      baseProjectConfig.metadata = { enabled: true, kind: "prepend" };
      generator = new MetadataGenerator(baseProjectConfig);

      const content = "# Test Content\n\nHello World";
      const metadata = { title: "Test Page", description: "Test Description" };

      const result = generator.prependMetadata(content, metadata);

      expect(result).toContain("---");
      expect(result).toContain("title: Test Page");
      expect(result).toContain("description: Test Description");
      expect(result).toContain(content);
      expect(result.startsWith("---")).toBe(true);
    });

    it("should prepend JSON metadata when format is json", () => {
      baseProjectConfig.metadata = {
        enabled: true,
        kind: "prepend",
        prepend: { format: "json" },
      };
      generator = new MetadataGenerator(baseProjectConfig);

      const content = "# Test Content\n\nHello World";
      const metadata = { title: "Test Page", description: "Test Description" };

      const result = generator.prependMetadata(content, metadata);

      expect(result).toContain("---");
      expect(result).toContain('"title": "Test Page"');
      expect(result).toContain('"description": "Test Description"');
      expect(result).toContain(content);
    });

    it("should use custom separator", () => {
      baseProjectConfig.metadata = {
        enabled: true,
        kind: "prepend",
        prepend: { separator: "+++" },
      };
      generator = new MetadataGenerator(baseProjectConfig);

      const content = "# Test Content";
      const metadata = { title: "Test" };

      const result = generator.prependMetadata(content, metadata);

      expect(result).toContain("+++");
      expect(result).not.toContain("---");
    });

    it("should use custom method when provided", () => {
      const customMethod = ({
        content,
        metadata,
      }: {
        content: string;
        metadata: Record<string, unknown>;
      }) => {
        return `<!-- ${JSON.stringify(metadata)} -->\n${content}`;
      };

      baseProjectConfig.metadata = {
        enabled: true,
        kind: "prepend",
        prepend: { method: customMethod },
      };
      generator = new MetadataGenerator(baseProjectConfig);

      const content = "# Test Content";
      const metadata = { title: "Test Page" };

      const result = generator.prependMetadata(content, metadata);

      expect(result).toBe('<!-- {"title":"Test Page"} -->\n# Test Content');
      expect(result).not.toContain("---");
    });

    it("should handle complex metadata objects in YAML format", () => {
      baseProjectConfig.metadata = { enabled: true, kind: "prepend" };
      generator = new MetadataGenerator(baseProjectConfig);

      const content = "# Test Content";
      const metadata = {
        title: "Test Page",
        keywords: ["test", "page"],
        authors: [{ name: "John Doe" }],
      };

      const result = generator.prependMetadata(content, metadata);

      expect(result).toContain("title: Test Page");
      expect(result).toContain("keywords:");
      expect(result).toContain("- test");
      expect(result).toContain("- page");
      expect(result).toContain("authors:");
      expect(result).toContain("- name: John Doe");
    });

    it("should handle complex metadata objects in JSON format", () => {
      baseProjectConfig.metadata = {
        enabled: true,
        kind: "prepend",
        prepend: { format: "json" },
      };
      generator = new MetadataGenerator(baseProjectConfig);

      const content = "# Test Content";
      const metadata = {
        title: "Test Page",
        keywords: ["test", "page"],
        authors: [{ name: "John Doe" }],
      };

      const result = generator.prependMetadata(content, metadata);

      const parsed = JSON.parse(result.split("---")[1]);
      expect(parsed.title).toBe("Test Page");
      expect(parsed.keywords).toEqual(["test", "page"]);
      expect(parsed.authors).toEqual([{ name: "John Doe" }]);
    });
  });

  describe("metadata transform", () => {
    it("should apply transform function when configured", () => {
      baseProjectConfig.metadata = {
        enabled: true,
        transform: (metadata: Record<string, unknown>) => ({
          ...metadata,
          transformed: true,
          titleUpper: typeof metadata.title === "string" ? metadata.title.toUpperCase() : "",
        }),
      };
      generator = new MetadataGenerator(baseProjectConfig);

      const pageConfig: PageConfig = {
        title: "Test Page",
        description: "Test Description",
        language: "en",
      };

      const metadata = generator.createMetadata(
        "src/test.md",
        "dist/test.metadata.json",
        pageConfig,
      );

      expect((metadata as any).transformed).toBe(true);
      expect((metadata as any).titleUpper).toBe("TEST PAGE");
      expect(metadata.title).toBe("Test Page");
    });

    it("should not modify metadata when no transform is configured", () => {
      baseProjectConfig.metadata = { enabled: true };
      generator = new MetadataGenerator(baseProjectConfig);

      const pageConfig: PageConfig = {
        title: "Test Page",
        description: "Test Description",
        language: "en",
      };

      const metadata = generator.createMetadata(
        "src/test.md",
        "dist/test.metadata.json",
        pageConfig,
      );

      expect((metadata as any).transformed).toBeUndefined();
      expect(metadata.title).toBe("Test Page");
    });
  });

  describe("generateMetadataOutputPath", () => {
    beforeEach(() => {
      generator = new MetadataGenerator(baseProjectConfig);
    });

    it("should generate correct metadata path for .html file", () => {
      const outputPath = "/project/dist/page.html";
      const metadataPath = generator.generateMetadataOutputPath(outputPath);
      expect(metadataPath).toBe("/project/dist/page.metadata.json");
    });

    it("should generate correct metadata path for .md file", () => {
      const outputPath = "/project/dist/docs/readme.md";
      const metadataPath = generator.generateMetadataOutputPath(outputPath);
      expect(metadataPath).toBe("/project/dist/docs/readme.metadata.json");
    });

    it("should handle nested paths", () => {
      const outputPath = "/project/dist/deep/nested/path/file.html";
      const metadataPath = generator.generateMetadataOutputPath(outputPath);
      expect(metadataPath).toBe("/project/dist/deep/nested/path/file.metadata.json");
    });

    it("should handle files with multiple dots", () => {
      const outputPath = "/project/dist/my.file.name.html";
      const metadataPath = generator.generateMetadataOutputPath(outputPath);
      expect(metadataPath).toBe("/project/dist/my.file.name.metadata.json");
    });
  });

  describe("writeMetadataFile", () => {
    beforeEach(() => {
      generator = new MetadataGenerator(baseProjectConfig);
    });

    it("should write metadata to file", async () => {
      const metadataPath = "/project/dist/test.metadata.json";
      const metadata: PageMetadata = {
        source: "src/test.md",
        metadataOutputPath: "dist/test.metadata.json",
        projectConfig: baseProjectConfig,
        title: "Test Page",
        description: "Test Description",
      };

      await generator.writeMetadataFile(metadataPath, metadata);

      expect(mockFs.mkdir).toHaveBeenCalledWith("/project/dist", { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        metadataPath,
        expect.stringContaining('"title": "Test Page"'),
        "utf-8",
      );
    });

    it("should create directories if they don't exist", async () => {
      const metadataPath = "/project/dist/deep/nested/test.metadata.json";
      const metadata: PageMetadata = {
        source: "src/test.md",
        metadataOutputPath: "dist/test.metadata.json",
        projectConfig: baseProjectConfig,
        title: "Test",
      };

      await generator.writeMetadataFile(metadataPath, metadata);

      expect(mockFs.mkdir).toHaveBeenCalledWith("/project/dist/deep/nested", { recursive: true });
    });
  });

  describe("METADATA_SUFFIX constant", () => {
    it("should have correct suffix value", () => {
      expect(MetadataGenerator.METADATA_SUFFIX).toBe(".metadata");
    });
  });
});
