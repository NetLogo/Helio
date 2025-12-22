import type { FileAfterParseHook } from "@nuxt/content";

export namespace NuxtAST {
  export type Tree = Array<Node>;

  export type NodeOnlyTagName = [TagName];
  export type NodeWithProps = [TagName, Props];
  // eslint-disable-next-line @typescript-eslint/array-type
  export type NodeWithChildren = [TagName, Props, ...Node[]];
  export type Node = string | NodeWithChildren | NodeWithProps | NodeOnlyTagName;

  export type MediaTagName = "img" | "video" | "audio" | "source" | "track";
  export type HeadingTagName = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  export type TextTagName = "p" | "span" | "a" | "strong" | "em" | "b" | "i" | "u";
  export type ContainerTagName =
    | "div"
    | "section"
    | "article"
    | "header"
    | "footer"
    | "main"
    | "nav"
    | "aside";
  export type ListTagName = "ul" | "ol" | "li" | "dl" | "dt" | "dd";
  export type TableTagName = "table" | "thead" | "tbody" | "tr" | "th" | "td" | "caption";
  export type FormTagName =
    | "form"
    | "input"
    | "textarea"
    | "button"
    | "select"
    | "option"
    | "label"
    | "fieldset"
    | "legend";
  export type OtherTagName =
    | "br"
    | "hr"
    | "code"
    | "pre"
    | "blockquote"
    | "iframe"
    | "svg"
    | "path"
    | "circle"
    | "rect"
    | "line"
    | "polyline"
    | "polygon";

  export type TagName =
    | HeadingTagName
    | TextTagName
    | ContainerTagName
    | ListTagName
    | TableTagName
    | FormTagName
    | MediaTagName
    | OtherTagName
    | string;
  export type Props = Record<string, any>;
  export enum WalkOptions {
    SKIP = "skip",
    EXIT = "exit",
    CONTINUE = "continue",
  }

  export type WalkCallback = (
    node: Node,
    index: number,
    parent: Tree | Node | null,
  ) => void | WalkOptions | Promise<void | WalkOptions>;

  export function hasChildren(node: Node): node is NodeWithChildren {
    return (
      typeof node === "object" &&
      Array.isArray(node) &&
      node.length >= 3 &&
      node.slice(2).every((n) => Array.isArray(n) || typeof n === "string")
    );
  }

  export function getChildren(node: NodeWithChildren): Array<Node> {
    const [, , ...children] = node;
    return children;
  }

  export function hasProps(node: Node): node is NodeWithProps | NodeWithChildren {
    return node.length >= 2 && typeof node[1] === "object" && !Array.isArray(node[1]);
  }

  export type Content = FileAfterParseHook["content"] & {
    body?:
      | {
          type: "minimark" | "minimal";
          value: Tree;
        }
      | {
          type: string;
          value: unknown;
        };
  };

  export type File = FileAfterParseHook["file"] & {
    assetsRoot?: string;
  };

  export type AfterParseHook = FileAfterParseHook & {
    content: Content;
    file: File;
  };

  export function isMinimarkBody(
    body: Content["body"],
  ): body is { type: "minimark" | "minimal"; value: Tree } {
    return (
      body !== undefined &&
      typeof body === "object" &&
      (body.type === "minimark" || body.type === "minimal") &&
      Array.isArray(body.value)
    );
  }
  export async function walk(tree: Tree, callback: WalkCallback): Promise<boolean> {
    const visit = async (
      node: Node,
      index: number,
      parent: Tree | Node | null,
    ): Promise<WalkOptions | void> => {
      const res = await callback(node, index, parent);
      if (res === WalkOptions.EXIT) {
        return WalkOptions.EXIT;
      }

      if (res !== WalkOptions.SKIP && hasChildren(node)) {
        const children = getChildren(node);
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as Node;
          const r = await visit(child, i, node);
          if (r === WalkOptions.EXIT) {
            return WalkOptions.EXIT;
          }
        }
      }

      return undefined;
    };

    for (let i = 0; i < tree.length; i++) {
      const node = tree[i] as Node;
      const r = await visit(node, i, tree);
      if (r === WalkOptions.EXIT) return false;
    }

    return true;
  }
}
