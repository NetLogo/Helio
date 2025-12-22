import type { Root as HRoot } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { isNodeElement, isNodeHeading, next } from "./utils";

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

export default rehypeTocWrapper;
