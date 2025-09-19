import type { Element, Root } from 'hast';
import { h } from 'hastscript';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

type TableWrapperOptions = {
  tagName?: string;
  className?: string;
};

const rehypeTableWrapper: Plugin<[], Root> = (options: TableWrapperOptions = {}) => {
  const { className = 'table-container', tagName = 'div' } = options;
  const selector = `${tagName}.${className}`;
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (!parent) return;
      else if (typeof index !== 'number') return;

      if (node.tagName === 'table') {
        // @ts-expect-error hast types are wrong
        const wrapper = h(selector, node); // Create the wrapper div
        parent.children[index] = wrapper as Element; // Replace the table with the wrapper
      }
    });
  };
};

export default rehypeTableWrapper;
