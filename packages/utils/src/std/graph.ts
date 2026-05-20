type RK = string | number | symbol;

type Tree<T extends Record<PropertyKey, unknown>> = Array<Node<T>>;
type Node<T extends Record<PropertyKey, unknown>> = T & {
  [K in RK]?: Array<Node<T>>;
};

enum WalkOptions {
  SKIP = "skip",
  EXIT = "exit",
  CONTINUE = "continue",
}

type WalkCallback<T extends Record<PropertyKey, unknown>> = (
  node: Node<T>,
  index: number,
  parent: Tree<T> | Node<T> | null,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => void | WalkOptions | Promise<void | WalkOptions>;

function hasChildren<T extends Record<PropertyKey, unknown>>(
  node: Node<T>,
  recursionKey: RK,
): boolean {
  return Array.isArray(node[recursionKey]) && node[recursionKey].length > 0;
}

function getChildren<T extends Record<PropertyKey, unknown>>(
  node: Node<T>,
  recursionKey: RK,
): Array<Node<T>> {
  return node[recursionKey] ?? [];
}

async function walk<T extends Record<PropertyKey, unknown>>(
  tree: Tree<T>,
  callback: WalkCallback<T>,
  recursionKey: RK,
): Promise<boolean> {
  const visit = async (
    node: Node<T>,
    index: number,
    parent: Tree<T> | Node<T> | null,
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ): Promise<WalkOptions | undefined | void> => {
    const res = await callback(node, index, parent);
    if (res === WalkOptions.EXIT) {
      return WalkOptions.EXIT;
    }

    if (res !== WalkOptions.SKIP && hasChildren(node, recursionKey)) {
      const children = getChildren(node, recursionKey);
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!child) continue;
        const r = await visit(child, i, node);
        if (r === WalkOptions.EXIT) {
          return WalkOptions.EXIT;
        }
      }
    }

    return undefined;
  };

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (!node) continue;
    const r = await visit(node, i, tree);
    if (r === WalkOptions.EXIT) return false;
  }

  return true;
}

export { walk, WalkOptions };
export type { Node, Tree, WalkCallback };
