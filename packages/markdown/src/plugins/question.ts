import type { Plugin } from 'unified';
import type { Literal, Node, Parent } from 'unist';
import { u } from 'unist-builder';
import { visit } from 'unist-util-visit';
import type { Content } from './utils';

export const remarkRehypeQuestion: Plugin = () => {
  return (tree: Node) => {
    visit(tree, 'paragraph', (node: Content, index: number, parent: Parent | null) => {
      if (!parent) return;
      else if (!('children' in parent)) return;
      else if (!Array.isArray(parent.children)) return;
      else if (!('children' in node)) return;
      else if (!Array.isArray(node.children)) return;
      else if (node.children.length === 0) return;

      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'text') return;

      const textNode = node.children[0] as Literal;
      const match = /^\s?\| (.*)?/.exec(textNode.value as string);

      if (match) {
        const questionContent = match[1];

        const questionNode = u('containerDirective', {
          data: {
            hName: 'p',
            hProperties: { className: ['question'] },
          },
          children: [{ type: 'text', value: questionContent }],
        });

        parent.children.splice(index, 1, questionNode);
      }
    });
  };
};
