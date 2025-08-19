import type { Root } from 'hast';
import { h } from 'hastscript';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

interface TableWrapperOptions {
  tagName?: string;
  className?: string;
}

const rehypeTableWrapper: Plugin<[], Root> = (
  options: TableWrapperOptions = {}
) => {
  const { className = 'table-container', tagName = 'div' } = options;
  const selector = `${tagName}.${className}`;
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (!parent) return;
      else if (!index) return;

      if (node.tagName === 'table') {
        const wrapper = h(selector, node as any); // Create the wrapper div
        parent.children[index] = wrapper as any; // Replace the table with the wrapper
      }
    });
  };
};

export default rehypeTableWrapper;
