import type { Root as HRoot } from "hast";
import type { Root as MRoot } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { isNodeElement, isNodeHeading, next } from "./utils";
import remarkToc from "remark-toc";

// wrap TOC in a div.toc
export const rehypeTocWrapper: Plugin<[], HRoot> = () => {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (!parent) return;
      if (typeof index !== "number") return;
      if (isNodeHeading(node) && node.properties["id"] === "table-of-contents") {
        const [sibling, siblingIndex] = next(parent, index, isNodeElement);
        if (isNodeElement(sibling) && sibling.tagName === "ul") {
          parent.children.splice(index, siblingIndex - index + 1, {
            type: "element",
            tagName: "div",
            properties: { className: ["toc"] },
            children: [node, sibling],
          });
        }
      }
    });
  };
};

/*
 * Plugin to add per-page TOC options to override
 * global TOC settings.
 *
 * Syntax:
 * Table of Contents { JSON options }
 *
 * Example:
 * Table of Contents { "maxDepth": 3, "className": "custom-toc" }
 * */
export const remarkTocExtras: Plugin<[], MRoot> = () => {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent) return;
      if (typeof index !== "number") return;

      const regex = /^Table of Contents\s*(\{[\s\S]+\})$/;
      const tocOptionsMatch = node.value.match(regex);
      if (tocOptionsMatch && tocOptionsMatch[1]) {
        try {
          const optionsString = tocOptionsMatch[1].trim();
          // Replace curly quotes with straight quotes
          // to handle copy-paste issues
          const normalizedOptionsString = optionsString.replace(/“|”/g, '"').replace(/‘|’/g, "'");
          const options = JSON.parse(normalizedOptionsString);

          node.value = "Table of Contents";

          const tocPlugin = remarkToc({ heading: "Table of Contents", ...options });
          tocPlugin(tree);
        } catch (error) {
          console.warn("Error parsing TOC options:", error);
        }
      }
    });
  };
};
