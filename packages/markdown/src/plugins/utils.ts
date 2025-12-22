import type { Element, RootContent as HastRootContent, Root } from "hast";
import type { RootContent as MDRootContent } from "mdast";
import type { TestFunction } from "unist-util-is";

export type Content = HastRootContent | MDRootContent;

export const isNodeElement = (node?: Content | { type: string }): node is Element => {
  return node?.type === "element";
};

export const isNodeHeading = (
  node: Content | { type: string } | undefined,
  { minHeadingLevel = 1, maxHeadingLevel = 6 } = {},
): node is Element => {
  return (
    isNodeElement(node) &&
    node.tagName.startsWith("h") &&
    node.tagName.length === 2 &&
    !isNaN(Number(node.tagName[1])) &&
    Number(node.tagName[1]) >= minHeadingLevel &&
    Number(node.tagName[1]) <= maxHeadingLevel
  );
};

export const hasNoChild = (test: TestFunction, { recursive = false } = {}): TestFunction => {
  return (node) => {
    if (!isNodeElement(node)) return true;
    if (node.children.length === 0) return true;
    if (!recursive) {
      return !node.children.some((child) => test(child) ?? false);
    }
    const _next = (children: Array<Content>): boolean => {
      for (const child of children) {
        if (test(child) ?? false) return true;
        if (isNodeElement(child) && _next(child.children)) return true;
      }
      return false;
    };
    return !_next(node.children);
  };
};

export const next = (
  parent: Root | Element | undefined,
  firstIndex: number,
  stop: (node?: Content | { type: string }) => boolean,
): readonly [Content | undefined, number] => {
  if (!parent) return [undefined, -1] as const;
  for (let i = firstIndex + 1; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (stop(child)) return [child, i] as const;
  }
  return [undefined, -1] as const;
};

export const extractText = (node: Content | undefined): string => {
  if (!node) return "";
  if (!("type" in node)) return "";
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(extractText).join("");
  return "";
};
