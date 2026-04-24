import { describe, expect, it, vi } from "vitest";
import * as _Graph from "./graph";

type N = { id: number; children?: N[] };

const makeTree = (): N[] => [
  {
    id: 1,
    children: [
      { id: 2, children: [{ id: 4 }, { id: 5 }] },
      { id: 3, children: [{ id: 6 }] },
    ],
  },
  { id: 7, children: [{ id: 8 }] },
];

describe("Graph.walk", () => {
  it("visits every node exactly once on a full traversal", async () => {
    const tree = makeTree();
    const seen: number[] = [];
    const done = await _Graph.walk<N, "children">(
      tree,
      (n) => {
        seen.push(n.id);
      },
      "children",
    );

    expect(done).toBe(true);
    expect(seen).toHaveLength(8);
    expect(new Set(seen).size).toBe(seen.length);
    expect(new Set(seen)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
  });

  it("visits parents before their descendants (pre-order invariant)", async () => {
    const tree = makeTree();
    const order: number[] = [];
    await _Graph.walk<N, "children">(
      tree,
      (n) => {
        order.push(n.id);
      },
      "children",
    );

    const idx = (id: number) => order.indexOf(id);
    // parent-before-child for each edge
    const edges: Array<[number, number]> = [
      [1, 2],
      [1, 3],
      [2, 4],
      [2, 5],
      [3, 6],
      [7, 8],
    ];
    for (const [p, c] of edges) {
      expect(idx(p)).toBeLessThan(idx(c));
      expect(idx(p)).toBeGreaterThanOrEqual(0);
      expect(idx(c)).toBeGreaterThanOrEqual(0);
    }
  });

  it("passes correct index and parent to the callback", async () => {
    const tree = makeTree();
    const records: Array<{ id: number; index: number; parentId: number | "root" }> = [];

    await _Graph.walk<N, "children">(
      tree,
      (n, index, parent) => {
        const parentId =
          parent === tree ? "root" : parent && "id" in (parent as N) ? (parent as N).id : "root";
        records.push({ id: n.id, index, parentId });
      },
      "children",
    );

    const byId = new Map(records.map((r) => [r.id, r]));
    expect(byId.get(1)).toMatchObject({ index: 0, parentId: "root" });
    expect(byId.get(7)).toMatchObject({ index: 1, parentId: "root" });
    expect(byId.get(2)).toMatchObject({ index: 0, parentId: 1 });
    expect(byId.get(3)).toMatchObject({ index: 1, parentId: 1 });
    expect(byId.get(4)).toMatchObject({ index: 0, parentId: 2 });
    expect(byId.get(5)).toMatchObject({ index: 1, parentId: 2 });
    expect(byId.get(6)).toMatchObject({ index: 0, parentId: 3 });
    expect(byId.get(8)).toMatchObject({ index: 0, parentId: 7 });
  });

  it("SKIP prevents descent into children but continues siblings", async () => {
    const tree = makeTree();
    const seen: number[] = [];

    await _Graph.walk<N, "children">(
      tree,
      (n) => {
        seen.push(n.id);
        if (n.id === 2) return _Graph.WalkOptions.SKIP;
      },
      "children",
    );

    // node 2 itself visited, but not its descendants 4, 5
    expect(seen).toContain(2);
    expect(seen).not.toContain(4);
    expect(seen).not.toContain(5);
    // siblings of 2 and the second root still visited
    expect(seen).toEqual(expect.arrayContaining([1, 3, 6, 7, 8]));
  });

  it("EXIT stops traversal and returns false", async () => {
    const tree = makeTree();
    const seen: number[] = [];

    const done = await _Graph.walk<N, "children">(
      tree,
      (n) => {
        seen.push(n.id);
        if (n.id === 3) return _Graph.WalkOptions.EXIT;
      },
      "children",
    );

    expect(done).toBe(false);
    expect(seen).toContain(3);
    // nothing visited after the exit node
    expect(seen).not.toContain(6);
    expect(seen).not.toContain(7);
    expect(seen).not.toContain(8);
  });

  it("returns true when traversal completes without EXIT", async () => {
    const tree = makeTree();
    const done = await _Graph.walk<N, "children">(tree, () => {}, "children");
    expect(done).toBe(true);
  });

  it("CONTINUE behaves identically to returning undefined", async () => {
    const tree = makeTree();
    const a: number[] = [];
    const b: number[] = [];

    await _Graph.walk<N, "children">(
      tree,
      (n) => {
        a.push(n.id);
        return _Graph.WalkOptions.CONTINUE;
      },
      "children",
    );
    await _Graph.walk<N, "children">(
      tree,
      (n) => {
        b.push(n.id);
      },
      "children",
    );

    expect(a).toEqual(b);
  });

  it("handles empty trees", async () => {
    const seen: number[] = [];
    const done = await _Graph.walk<N, "children">(
      [],
      (n) => {
        seen.push(n.id);
      },
      "children",
    );
    expect(done).toBe(true);
    expect(seen).toEqual([]);
  });

  it("handles nodes without the recursion key", async () => {
    const tree: N[] = [{ id: 1 }, { id: 2 }];
    const seen: number[] = [];
    const done = await _Graph.walk<N, "children">(
      tree,
      (n) => {
        seen.push(n.id);
      },
      "children",
    );
    expect(done).toBe(true);
    expect(new Set(seen)).toEqual(new Set([1, 2]));
  });

  it("treats an empty children array as a leaf (no descent)", async () => {
    const tree: N[] = [{ id: 1, children: [] }];
    const cb = vi.fn();
    await _Graph.walk<N, "children">(tree, cb, "children");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("supports async callbacks and awaits them before descending", async () => {
    const tree = makeTree();
    const seen: number[] = [];
    const done = await _Graph.walk<N, "children">(
      tree,
      async (n) => {
        await new Promise((r) => setTimeout(r, 0));
        seen.push(n.id);
      },
      "children",
    );
    expect(done).toBe(true);
    // parent recorded before children even with async delay
    expect(seen.indexOf(1)).toBeLessThan(seen.indexOf(2));
    expect(seen.indexOf(2)).toBeLessThan(seen.indexOf(4));
  });

  it("supports async SKIP and EXIT return values", async () => {
    const tree = makeTree();
    const skipped: number[] = [];
    await _Graph.walk<N, "children">(
      tree,
      async (n) => {
        skipped.push(n.id);
        if (n.id === 2) return _Graph.WalkOptions.SKIP;
      },
      "children",
    );
    expect(skipped).not.toContain(4);
    expect(skipped).not.toContain(5);

    const seen: number[] = [];
    const done = await _Graph.walk<N, "children">(
      tree,
      async (n) => {
        seen.push(n.id);
        if (n.id === 3) return _Graph.WalkOptions.EXIT;
      },
      "children",
    );
    expect(done).toBe(false);
    expect(seen).not.toContain(6);
  });

  it("works with a custom recursion key", async () => {
    type M = { id: number; kids?: M[] };
    const tree: M[] = [{ id: 1, kids: [{ id: 2, kids: [{ id: 3 }] }] }];
    const seen: number[] = [];
    await _Graph.walk<M, "kids">(
      tree,
      (n) => {
        seen.push(n.id);
      },
      "kids",
    );
    expect(new Set(seen)).toEqual(new Set([1, 2, 3]));
    expect(seen.indexOf(1)).toBeLessThan(seen.indexOf(2));
    expect(seen.indexOf(2)).toBeLessThan(seen.indexOf(3));
  });
});
