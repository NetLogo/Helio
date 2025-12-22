import type { Root } from "hast";
import type { Code, Html, InlineCode } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

import highlightNL from "../lib/highlight-nl";

export const remarkHighlightNL: Plugin<[], Root> = () => {
  return (tree) => {
    const isNLogo = (node: Code): boolean => {
      const lang = (node.lang ?? "").toLowerCase();
      if (["nlogo", "netlogo"].includes(lang)) return true;
      if (node.lang === undefined || node.lang === null) return true;
      return false;
    };

    visit(tree, "code", (node: Code | Html) => {
      if (node.value && isNLogo(node as Code)) {
        (node as Html).type = "html"; // emit as raw HTML
        (node as Html).value = `<pre><code>${highlightNL(node.value)}</code></pre>`;
        (node as Html).value = (node as Html).value.replace(/\n/g, "<br/>");
      }
    });

    visit(tree, "inlineCode", (node: InlineCode | Html) => {
      if (!node.value) return;
      if (node.value.split(" ").length < 2) return; // only highlight if multiple words
      (node as Html).type = "html";
      (node as Html).value = `<code>${highlightNL(node.value)}</code>`;
    });
  };
};

export default remarkHighlightNL;
