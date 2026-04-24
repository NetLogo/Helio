type Tree<T extends Record<PropertyKey, unknown>, RK extends keyof any> = Array<Node<T, RK>>;
type Node<T extends Record<PropertyKey, unknown>, RK extends keyof any> = T & {
  [K in RK]?: Array<Node<T, RK>>;
};

enum WalkOptions {
  SKIP = "skip",
  EXIT = "exit",
  CONTINUE = "continue",
}

type WalkCallback<T extends Record<PropertyKey, unknown>, RK extends keyof any> = (
  node: Node<T, RK>,
  index: number,
  parent: Tree<T, RK> | Node<T, RK> | null,
) => void | WalkOptions | Promise<void | WalkOptions>;

function hasChildren<T extends Record<PropertyKey, unknown>, RK extends keyof any>(
  node: Node<T, RK>,
  recursionKey: RK,
): boolean {
  return Array.isArray(node[recursionKey]) && node[recursionKey]!.length > 0;
}

function getChildren<T extends Record<PropertyKey, unknown>, RK extends keyof any>(
  node: Node<T, RK>,
  recursionKey: RK,
): Array<Node<T, RK>> {
  return (node[recursionKey] as Array<Node<T, RK>>) || [];
}

async function walk<T extends Record<PropertyKey, unknown>, RK extends keyof any>(
  tree: Tree<T, RK>,
  callback: WalkCallback<T, RK>,
  recursionKey: RK,
): Promise<boolean> {
  const visit = async (
    node: Node<T, RK>,
    index: number,
    parent: Tree<T, RK> | Node<T, RK> | null,
  ): Promise<WalkOptions | void> => {
    const res = await callback(node, index, parent);
    if (res === WalkOptions.EXIT) {
      return WalkOptions.EXIT;
    }

    if (res !== WalkOptions.SKIP && hasChildren(node, recursionKey)) {
      const children = getChildren(node, recursionKey);
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as Node<T, RK>;
        const r = await visit(child, i, node);
        if (r === WalkOptions.EXIT) {
          return WalkOptions.EXIT;
        }
      }
    }

    return undefined;
  };

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i] as Node<T, RK>;
    const r = await visit(node, i, tree);
    if (r === WalkOptions.EXIT) return false;
  }

  return true;
}

export { walk, WalkOptions };
export type { Node, Tree, WalkCallback };
