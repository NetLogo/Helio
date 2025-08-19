import type { Root } from 'hast';
import type { Code, InlineCode } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

import highlightNL from '../lib/highlight-nl';

export const remarkHighlightNL: Plugin<[], Root> = () => {
  return (tree) => {
    const isNLogo = (node: Code) =>
      node.lang === 'netlogo' || node.lang === 'nlogo' || !node.lang;

    visit(tree, 'code', (node: Code) => {
      if (node.value && isNLogo(node)) {
        (node as any).type = 'html'; // emit as raw HTML
        (node as any).value =
          `<pre><code>${highlightNL(node.value)}</code></pre>`;
      }
    });

    visit(tree, 'inlineCode', (node: InlineCode) => {
      (node as any).type = 'html';
      (node as any).value = `<code>${highlightNL(node.value)}</code>`;
    });
  };
};
