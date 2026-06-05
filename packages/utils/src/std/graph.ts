type RK = string | number | symbol;

type Node<T, K extends RK> = T & { [P in K]?: Array<Node<T, K>> };
type Tree<T, K extends RK> = Array<Node<T, K>>;

enum WalkOptions {
  SKIP = "skip",
  EXIT = "exit",
  CONTINUE = "continue",
}

type WalkCallback<T, K extends RK> = (
  node: Node<T, K>,
  index: number,
  parent: Tree<T, K> | Node<T, K> | null,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => void | WalkOptions | Promise<void | WalkOptions>;

function getChildren<T, K extends RK>(node: Node<T, K>, recursionKey: K): Array<Node<T, K>> {
  const value = (node as Record<RK, unknown>)[recursionKey];
  return Array.isArray(value) ? (value as Array<Node<T, K>>) : [];
}

async function walk<T, K extends RK>(
  tree: Tree<T, K>,
  callback: WalkCallback<T, K>,
  recursionKey: K,
): Promise<boolean> {
  const visit = async (
    node: Node<T, K>,
    index: number,
    parent: Tree<T, K> | Node<T, K> | null,
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ): Promise<WalkOptions | undefined | void> => {
    const res = await callback(node, index, parent);
    if (res === WalkOptions.EXIT) {
      return WalkOptions.EXIT;
    }

    if (res !== WalkOptions.SKIP) {
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
