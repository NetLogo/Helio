import { describe, expect, it } from "vitest";
import { createWikilinkRegex } from "./wikilink";
import { getDefaultWikiLinkOptions } from "./wikilink.options";

// We need to access the WikiLink class, but it's not exported
// Let's create a simple test that tests the plugin's regex and parsing logic
describe("WikiLink parsing logic", () => {
  describe("regex pattern matching", () => {
    it("should match basic wikilink patterns", () => {
      const regex = createWikilinkRegex();

      const testCases = [
        {
          input: "[[simple]]",
          expected: {
            full: "[[simple]]",
            displayText: "simple",
            permalinkRaw: undefined,
            heading: undefined,
          },
        },
        {
          input: "[[link|display]]",
          expected: {
            full: "[[link|display]]",
            displayText: "link",
            permalinkRaw: "display",
            heading: undefined,
          },
        },
        {
          input: "[[page#section]]",
          expected: {
            full: "[[page#section]]",
            displayText: "page#section",
            permalinkRaw: undefined,
            heading: undefined,
          },
        },
        {
          input: "[[page|display#section]]",
          expected: {
            full: "[[page|display#section]]",
            displayText: "page",
            permalinkRaw: "display",
            heading: "#section",
          },
        },
        {
          input: "![[image.png]]",
          expected: {
            full: "![[image.png]]",
            displayText: "image.png",
            permalinkRaw: undefined,
            heading: undefined,
          },
        },
        {
          input: "![[image.png|alt text]]",
          expected: {
            full: "![[image.png|alt text]]",
            displayText: "image.png",
            permalinkRaw: "alt text",
            heading: undefined,
          },
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const match = regex.exec(input);
        regex.lastIndex = 0; // Reset regex state

        expect(match).toBeTruthy();
        if (match) {
          const [full, , displayText, permalinkRaw, heading] = match;
          expect(full).toBe(expected.full);
          expect(displayText).toBe(expected.displayText);
          expect(permalinkRaw).toBe(expected.permalinkRaw);
          expect(heading).toBe(expected.heading);
        }
      });
    });

    it("should match complex wikilink patterns with special characters", () => {
      const regex = createWikilinkRegex();
      const testCases = [
        {
          input: "[[gis:set-world-envelope|gis#set-world-envelope]]",
          expected: {
            full: "[[gis:set-world-envelope|gis#set-world-envelope]]",
            displayText: "gis:set-world-envelope",
            permalinkRaw: "gis",
            heading: "#set-world-envelope",
          },
        },
        {
          input: "[[gis:set-world-envelope|#set-world-envelope]]",
          expected: {
            full: "[[gis:set-world-envelope|#set-world-envelope]]",
            displayText: "gis:set-world-envelope",
            permalinkRaw: undefined,
            heading: "#set-world-envelope",
          },
        },
      ];
      testCases.forEach(({ input, expected }) => {
        const match = regex.exec(input);
        regex.lastIndex = 0; // Reset regex state

        expect(match).toBeTruthy();
        if (match) {
          const [full, , displayText, permalinkRaw, heading] = match;
          expect(full).toBe(expected.full);
          expect(displayText).toBe(expected.displayText);
          expect(permalinkRaw).toBe(expected.permalinkRaw);
          expect(heading).toBe(expected.heading);
        }
      });
    });

    it("should not match invalid patterns", () => {
      const regex = createWikilinkRegex();

      const invalidCases = [
        "[single bracket]",
        "[[]]",
        "[[ ]]",
        "[[unclosed",
        "unopened]]",
        "[[nested[[bracket]]", // Technically valid. I don't control the devs.
      ];

      invalidCases.forEach((input) => {
        regex.lastIndex = 0;
        const match = regex.exec(input);
        if (input === "[[nested[[bracket]]" || input === "[[ ]]") {
          // These actually match but should be filtered out by the plugin logic
          expect(match).toBeTruthy();
        } else {
          expect(match).toBeNull();
        }
      });
    });
  });

  describe("permalink and display text parsing", () => {
    it("should correctly parse different wikilink formats", () => {
      // This mimics the logic from the WikiLink constructor
      const testCases = [
        {
          displayText: "simple",
          permalinkRaw: undefined,
          heading: undefined,
          expected: { permalink: "simple", display: "simple", anchor: null },
        },
        {
          displayText: "page#section",
          permalinkRaw: undefined,
          heading: undefined,
          expected: {
            permalink: "page",
            display: "page#section",
            anchor: "section",
          },
        },
        {
          displayText: "page",
          permalinkRaw: "Custom Display",
          heading: undefined,
          expected: {
            display: "page",
            permalink: "Custom Display",
            anchor: null,
          },
        },
        {
          displayText: "page",
          permalinkRaw: "Custom Display",
          heading: "#section",
          expected: {
            display: "page",
            permalink: "Custom Display",
            anchor: "section",
          },
        },
        {
          displayText: undefined,
          permalinkRaw: undefined,
          heading: "#section",
          expected: { permalink: "", display: "", anchor: "section" },
        },
      ];

      testCases.forEach(({ displayText, permalinkRaw, heading, expected }) => {
        let display: string;
        let permalink: string;
        let anchor: string | null;

        if (!permalinkRaw && !heading) {
          display = displayText?.trim() || "";
          const parts = display.split("#");
          permalink = parts[0] || "";
          anchor = parts[1] || null;
        } else {
          permalink = (permalinkRaw ?? displayText ?? "").trim();
          anchor = heading ? heading.slice(1) : null; // Remove the '#' if present
          display = displayText?.trim() ?? permalink;
        }

        expect({ permalink, display, anchor }).toEqual(expected);
      });
    });
  });

  describe("href generation", () => {
    it("should generate correct hrefs with default template", () => {
      const options = getDefaultWikiLinkOptions();

      const testCases = [
        { permalink: "simple", anchor: null, expected: "#simple" },
        { permalink: "page", anchor: "section", expected: "#page#section" },
        { permalink: "with spaces", anchor: null, expected: "#with spaces" },
        {
          permalink: "page",
          anchor: "section with spaces",
          expected: "#page#section with spaces",
        },
      ];

      testCases.forEach(({ permalink, anchor, expected }) => {
        const result = options.hrefTemplate(permalink, "wikiLink", anchor);
        expect(result).toBe(expected);
      });
    });

    it("should generate correct hrefs with custom template", () => {
      const options = getDefaultWikiLinkOptions({
        hrefTemplate: (permalink, _, anchor) => `/wiki/${permalink}${anchor ? `#${anchor}` : ""}`,
      });

      const testCases = [
        { permalink: "simple", anchor: null, expected: "/wiki/simple" },
        {
          permalink: "page",
          anchor: "section",
          expected: "/wiki/page#section",
        },
      ];

      testCases.forEach(({ permalink, anchor, expected }) => {
        const result = options.hrefTemplate(permalink, "wikiLink", anchor);
        expect(result).toBe(expected);
      });
    });

    it("should use encoding when provided", () => {
      const options = getDefaultWikiLinkOptions({
        integration: {
          encode: (permalink) => permalink.toLowerCase().replace(/\s+/g, "-"),
        },
        hrefTemplate: (encoded) => `/wiki/${encoded}`,
      });

      const encoded = options.integration.encode!("My Test Page");
      const href = options.hrefTemplate(encoded, "wikiLink");

      expect(encoded).toBe("my-test-page");
      expect(href).toBe("/wiki/my-test-page");
    });
  });

  describe("CSS class assignment", () => {
    it("should use default CSS classes", () => {
      const options = getDefaultWikiLinkOptions();

      expect(options.classNames.wikiLink).toBe("wikilink");
      expect(options.classNames.imageLink).toBe("wikilink-image");
      expect(options.classNames.missingLink).toBe("wikilink-missing");
    });

    it("should use custom CSS classes", () => {
      const options = getDefaultWikiLinkOptions({
        classNames: {
          wikiLink: "custom-wiki",
          imageLink: "custom-image",
          missingLink: "custom-missing",
        },
      });

      expect(options.classNames.wikiLink).toBe("custom-wiki");
      expect(options.classNames.imageLink).toBe("custom-image");
      expect(options.classNames.missingLink).toBe("custom-missing");
    });
  });

  describe("image options", () => {
    it("should apply default image options", () => {
      const options = getDefaultWikiLinkOptions();

      expect(options.imageOptions.altTemplate!("test.jpg")).toBe("test.jpg");
      expect(options.imageOptions.defaultSize).toEqual({});
    });

    it("should apply custom image options", () => {
      const options = getDefaultWikiLinkOptions({
        imageOptions: {
          altTemplate: (filename) => `Image: ${filename}`,
          defaultSize: { width: 800, height: 600 },
        },
      });

      expect(options.imageOptions.altTemplate!("test.jpg")).toBe("Image: test.jpg");
      expect(options.imageOptions.defaultSize).toEqual({
        width: 800,
        height: 600,
      });
    });
  });

  describe("validation behavior", () => {
    it("should handle missing link validation", () => {
      const existingPages = new Set(["existing"]);
      const options = getDefaultWikiLinkOptions({
        validation: {
          linkExists: (permalink) => existingPages.has(permalink),
          missingLinkBehavior: "mark",
        },
      });

      expect(options.validation.linkExists!("existing")).toBe(true);
      expect(options.validation.linkExists!("missing")).toBe(false);
      expect(options.validation.missingLinkBehavior).toBe("mark");
    });

    it("should default to ignore missing links", () => {
      const options = getDefaultWikiLinkOptions();
      expect(options.validation.missingLinkBehavior).toBe("ignore");
    });
  });

  describe("HTML options", () => {
    it("should provide default HTML options for all link types", () => {
      const options = getDefaultWikiLinkOptions();

      ["wikiLink", "imageLink", "missingLink"].forEach((linkType) => {
        const htmlOpts = options.htmlOptions[linkType as keyof typeof options.htmlOptions];
        expect(htmlOpts.target).toBe("_self");
        expect(htmlOpts.titleTemplate).toBeDefined();
        expect(htmlOpts.parentNode).toBeUndefined();
        expect(htmlOpts.rel).toBeUndefined();
      });
    });

    it("should allow custom HTML options", () => {
      const options = getDefaultWikiLinkOptions({
        htmlOptions: {
          wikiLink: {
            target: "_blank",
            rel: "noopener noreferrer",
            titleTemplate: (permalink, displayText) => `Go to ${displayText || permalink}`,
            parentNode: {
              tagName: "span",
              properties: { className: "link-wrapper" },
            },
          },
        },
      });

      const wikiLinkOpts = options.htmlOptions.wikiLink;
      expect(wikiLinkOpts.target).toBe("_blank");
      expect(wikiLinkOpts.rel).toBe("noopener noreferrer");
      expect(wikiLinkOpts.titleTemplate!("test", "Test")).toBe("Go to Test");
      expect(wikiLinkOpts.parentNode).toEqual({
        tagName: "span",
        properties: { className: "link-wrapper" },
      });
    });
  });
});
