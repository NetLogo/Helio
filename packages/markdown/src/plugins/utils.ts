import type { Content, Element, Root } from 'hast';

export const isNodeElement = (node?: Content): node is Element => {
  return node?.type === 'element';
};

export const isNodeHeading = (
  node: Content | undefined,
  { minHeadingLevel = 1, maxHeadingLevel = 6 } = {}
): node is Element => {
  return (
    isNodeElement(node) &&
    node.tagName.startsWith('h') &&
    node.tagName.length === 2 &&
    !isNaN(Number(node.tagName[1])) &&
    Number(node.tagName[1]) >= minHeadingLevel &&
    Number(node.tagName[1]) <= maxHeadingLevel
  );
};

export const next = (
  parent: Root | Element | undefined,
  firstIndex: number,
  stop: (node?: Content) => boolean
): readonly [Content | undefined, number] => {
  if (!parent) return [undefined, -1] as const;
  for (let i = firstIndex + 1; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (stop(child)) return [child, i] as const;
  }
  return [undefined, -1] as const;
};
