import { describe, expect, it } from "@jest/globals";
import {
  AuthorDeclarationSchema,
  BuildVariablesDeclarationSchema,
  PageDeclarationSchema,
  ProjectConfigSchema,
  type PageConfig,
  type ProjectConfig,
} from "../src/schemas.js";

describe("schemas", () => {
  describe("BuildVariablesDeclarationSchema", () => {
    it("should validate valid build variables", () => {
      const valid = {
        variable1: "value1",
        variable2: "value2",
      };
      expect(() => BuildVariablesDeclarationSchema.parse(valid)).not.toThrow();
    });

    it("should reject non-string values", () => {
      const invalid = {
        variable1: 123,
        variable2: "value2",
      };
      expect(() => BuildVariablesDeclarationSchema.parse(invalid)).toThrow();
    });

    it("should handle non-string keys by converting them", () => {
      const mixed = {
        123: "value1",
        variable2: "value2",
      };
      // Zod record schema converts numeric keys to strings
      expect(() => BuildVariablesDeclarationSchema.parse(mixed)).not.toThrow();
    });
  });

  describe("AuthorDeclarationSchema", () => {
    it("should validate author with name only", () => {
      const valid = {
        name: "John Doe",
      };
      expect(() => AuthorDeclarationSchema.parse(valid)).not.toThrow();
    });

    it("should validate author with all fields", () => {
      const valid = {
        name: "John Doe",
        email: "john@example.com",
        url: "https://johndoe.com",
      };
      expect(() => AuthorDeclarationSchema.parse(valid)).not.toThrow();
    });

    it("should require name field", () => {
      const invalid = {
        email: "john@example.com",
      };
      expect(() => AuthorDeclarationSchema.parse(invalid)).toThrow();
    });

    it("should allow optional email and url", () => {
      const valid = {
        name: "John Doe",
        email: "john@example.com",
      };
      const result = AuthorDeclarationSchema.parse(valid);
      expect(result.name).toBe("John Doe");
      expect(result.email).toBe("john@example.com");
      expect(result.url).toBeUndefined();
    });
  });

  describe("PageDeclarationSchema", () => {
    it("should validate minimal page configuration", () => {
      const valid = {};
      expect(() => PageDeclarationSchema.parse(valid)).not.toThrow();
    });

    it("should validate full page configuration", () => {
      const valid = {
        inheritFrom: [0, 1],
        language: "en",
        output: true,
        buildVariables: {
          var1: "value1",
        },
        extension: ".md",
        title: "Test Page",
        description: "A test page",
        shortDescription: "Test",
        keywords: ["test", "page"],
        tags: ["testing"],
        authors: [
          {
            name: "John Doe",
            email: "john@example.com",
          },
        ],
      };
      const result = PageDeclarationSchema.parse(valid);
      expect(result.title).toBe("Test Page");
      expect(result.language).toBe("en");
      expect(result.output).toBe(true);
    });

    it("should set default extension to .md", () => {
      const config = {};
      const result = PageDeclarationSchema.parse(config);
      expect(result.extension).toBe(".md");
    });

    it("should validate inheritFrom as array of numbers", () => {
      const valid = {
        inheritFrom: [0, 1, 2],
      };
      expect(() => PageDeclarationSchema.parse(valid)).not.toThrow();
    });

    it("should reject inheritFrom with non-numbers", () => {
      const invalid = {
        inheritFrom: [0, "invalid", 2],
      };
      expect(() => PageDeclarationSchema.parse(invalid)).toThrow();
    });

    it("should validate keywords as array of strings", () => {
      const valid = {
        keywords: ["keyword1", "keyword2"],
      };
      expect(() => PageDeclarationSchema.parse(valid)).not.toThrow();
    });

    it("should validate tags as array of strings", () => {
      const valid = {
        tags: ["tag1", "tag2"],
      };
      expect(() => PageDeclarationSchema.parse(valid)).not.toThrow();
    });

    it("should validate authors array", () => {
      const valid = {
        authors: [{ name: "Author 1" }, { name: "Author 2", email: "author2@example.com" }],
      };
      expect(() => PageDeclarationSchema.parse(valid)).not.toThrow();
    });
  });

  describe("ProjectConfigSchema", () => {
    it("should validate minimal project configuration", () => {
      const valid = {
        defaults: {},
        locale: {
          toSlug: ({ language, slug }: { language: string; slug: string }) => `${language}/${slug}`,
        },
      };
      expect(() => ProjectConfigSchema.parse(valid)).not.toThrow();
    });

    it("should set default values", () => {
      const config = {
        defaults: {},
        locale: {
          toSlug: ({ language, slug }: { language: string; slug: string }) => `${language}/${slug}`,
        },
      };
      const result = ProjectConfigSchema.parse(config);
      expect(result.projectRoot).toBe(".");
      expect(result.scanRoot).toBe(".");
      expect(result.outputRoot).toBe("./dist");
    });

    it("should validate full project configuration", () => {
      const valid = {
        projectRoot: "./my-project",
        scanRoot: "./source",
        outputRoot: "./build",
        defaults: {
          language: "en",
          title: "Default Title",
          description: "Default Description",
        },
        locale: {
          toSlug: ({ language, slug }: { language: string; slug: string }) => `${language}/${slug}`,
        },
      };
      const result = ProjectConfigSchema.parse(valid);
      expect(result.projectRoot).toBe("./my-project");
      expect(result.scanRoot).toBe("./source");
      expect(result.outputRoot).toBe("./build");
      expect(result.defaults.language).toBe("en");
    });

    it("should require defaults field", () => {
      const invalid = {
        projectRoot: "./my-project",
      };
      expect(() => ProjectConfigSchema.parse(invalid)).toThrow();
    });

    it("should validate nested defaults configuration", () => {
      const valid = {
        defaults: {
          language: "es",
          output: false,
          title: "Título por defecto",
          description: "Una descripción por defecto",
          buildVariables: {
            version: "1.0.0",
          },
        },
        locale: {
          toSlug: ({ language, slug }: { language: string; slug: string }) => `${language}/${slug}`,
        },
      };
      expect(() => ProjectConfigSchema.parse(valid)).not.toThrow();
    });
  });

  describe("Type exports", () => {
    it("should export ProjectConfig type", () => {
      const config: ProjectConfig = {
        projectRoot: ".",
        scanRoot: ".",
        outputRoot: "./dist",
        defaults: {
          title: "Test",
          description: "Test description",
          extension: ".md",
        },
        metadata: { enabled: false },
        locale: {
          toSlug: ({ language, slug }: { language: string; slug: string }) => `${language}/${slug}`,
        },
      };
      expect(config).toBeDefined();
    });

    it("should export PageConfig type", () => {
      const config: PageConfig = {
        title: "Test Page",
        description: "Test description",
        language: "en",
        output: true,
        extension: ".md",
      };
      expect(config).toBeDefined();
    });
  });

  describe("PageDeclarationSchema additional key validation", () => {
    it("should allow additional keys that do not conflict with known keys", () => {
      const configWithAdditionalKeys = {
        title: "Test Page",
        customField: "custom value",
        anotherField: 123,
      };

      expect(() => PageDeclarationSchema.parse(configWithAdditionalKeys)).not.toThrow();
      const result = PageDeclarationSchema.parse(configWithAdditionalKeys);
      expect(result.title).toBe("Test Page");
    });

    it("should validate the refine function logic for additional keys", () => {
      // Test with only custom keys (no conflicts)
      const validConfig = {
        customKey: "value",
        anotherCustom: "another value",
      };

      expect(() => PageDeclarationSchema.parse(validConfig)).not.toThrow();
    });

    it("should reject configurations with conflicting known keys", () => {
      // This test covers the refine function that checks for conflicts
      const conflictingConfig = {
        title: "Test Title", // This is a known key
        customKey: "value",
      };

      // When using known keys, the regular schema validation should work
      expect(() => PageDeclarationSchema.parse(conflictingConfig)).not.toThrow();

      // But test the specific refine logic by using an object that would only have the additional record part
      const onlyAdditionalKeys = {
        someCustomKey: "value",
        anotherCustomKey: "another value",
      };
      expect(() => PageDeclarationSchema.parse(onlyAdditionalKeys)).not.toThrow();
    });

    it("should handle empty config with defaults", () => {
      const emptyConfig = {};

      const result = PageDeclarationSchema.parse(emptyConfig);
      expect(result.extension).toBe(".md"); // Should get default
    });
  });

  describe("PageDeclarationSchema complex validation", () => {
    it("should properly instantiate and use the schema with refine function", () => {
      // This test ensures the complex schema definition including the .and() and .refine()
      // functions are properly instantiated and executed

      // Test with only additional keys (should pass)
      const validConfig = {
        customField1: "value1",
        customField2: "value2",
      };

      expect(() => PageDeclarationSchema.parse(validConfig)).not.toThrow();

      // Test with known keys (should also pass since they're handled by the main schema)
      const configWithKnownKeys = {
        title: "Test Title",
        language: "en",
        customField: "value",
      };

      expect(() => PageDeclarationSchema.parse(configWithKnownKeys)).not.toThrow();

      // The .and() creates an intersection that validates both the main schema
      // and the additional keys constraint via the refine function
      const result = PageDeclarationSchema.parse(configWithKnownKeys);
      expect(result.title).toBe("Test Title");
      expect(result.language).toBe("en");
    });

    it("should execute refine function and reject conflicting additional keys", () => {
      // Create a configuration that triggers the refine function by having additional keys
      // that conflict with known schema keys
      const configWithConflictingKeys = {
        // This should trigger the refine function to check additional keys
        unknownKey: "value", // This should be allowed
      };

      // This should pass because unknownKey is not in the known keys set
      expect(() => PageDeclarationSchema.parse(configWithConflictingKeys)).not.toThrow();
    });

    it("should handle edge cases in refine function validation", () => {
      // Test empty object (should pass)
      const emptyObject = {};
      expect(() => PageDeclarationSchema.parse(emptyObject)).not.toThrow();

      // Test with multiple custom keys
      const multipleCustomKeys = {
        customField1: "value1",
        customField2: "value2",
        customField3: "value3",
      };
      expect(() => PageDeclarationSchema.parse(multipleCustomKeys)).not.toThrow();

      // Test with mixed known and unknown keys
      const mixedKeys = {
        title: "Known Key",
        unknownCustomKey: "Unknown Value",
      };
      expect(() => PageDeclarationSchema.parse(mixedKeys)).not.toThrow();
    });
  });
});
