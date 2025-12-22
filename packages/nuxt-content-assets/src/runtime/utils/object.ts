export type Walkable = { [key: string | number]: unknown };

export type WalkFilter = (value: unknown, key?: string | number) => boolean | void;

export type WalkCallback = (value: unknown, parent: Walkable, key: string | number) => void;

/**
 * Walk an object structure
 *
 * @param node
 * @param callback
 * @param filter
 */
export function walk(node: Walkable, callback: WalkCallback, filter?: WalkFilter): void {
  function visit(
    node: Walkable,
    callback: WalkCallback,
    parent: Walkable,
    key: string | number,
  ): void {
    // filter
    if (filter) {
      const result = filter(node, key);
      if (result === false) {
        return;
      }
    }

    // branch
    if (Array.isArray(node)) {
      node.forEach((value, index) => {
        visit(value, callback, node, index);
      });
    } else if (isObject(node)) {
      Object.keys(node).forEach((key) => {
        visit(node[key] as Walkable, callback, node, key);
      });
    }

    // leaf
    else {
      callback(node, parent, key);
    }
  }

  // begin
  visit(node, callback, { node }, "node");
}

export function isObject(data: unknown): data is Record<string, unknown> {
  return Boolean(data) && typeof data === "object" && !Array.isArray(data);
}
