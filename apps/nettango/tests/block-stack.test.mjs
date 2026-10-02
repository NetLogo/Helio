import assert from "node:assert/strict";
import { test } from "node:test";

import { indexBlocks } from "../app/utils/blockStack.ts";

const program = [
  { color: "green", label: "Go" },
  {
    color: "red",
    label: "Each ant",
    children: [
      {
        color: "blue",
        label: "If",
        param: "I am not carrying food",
        children: [{ color: "yellow", label: "Turn towards pheromone smell" }],
      },
      { color: "orange", label: "Wiggle" },
      { color: "purple", label: "Move forward" },
    ],
  },
];

const flatten = (nodes) => nodes.flatMap((node) => [node, ...flatten(node.nodes)]);

test("indexBlocks numbers blocks depth first across nesting", () => {
  const labels = flatten(indexBlocks(program)).map(({ index, label }) => [index, label]);
  assert.deepEqual(labels, [
    [0, "Go"],
    [1, "Each ant"],
    [2, "If"],
    [3, "Turn towards pheromone smell"],
    [4, "Wiggle"],
    [5, "Move forward"],
  ]);
});

test("indexBlocks gives every block a unique index usable as a key", () => {
  const indices = flatten(indexBlocks(program)).map((node) => node.index);
  assert.equal(new Set(indices).size, indices.length);
});

test("indexBlocks is stable across calls and keeps the input untouched", () => {
  const before = structuredClone(program);
  assert.deepEqual(indexBlocks(program), indexBlocks(program));
  assert.deepEqual(program, before);
});

test("indexBlocks returns an empty list for empty input", () => {
  assert.deepEqual(indexBlocks([]), []);
});
