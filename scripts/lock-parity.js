#!/usr/bin/env node
/*
 * Compares the resolved name@version set of two lockfiles, each in either the
 * Yarn 1 or the Berry format. Exits 1 when the sets differ.
 *
 * Usage: node scripts/lock-parity.js <yarn.lock A> <yarn.lock B>
 *
 * */

const fs = require("fs");
const { parseLock, resolvedSet } = require("./lib/yarn-lock");

function compareLocks(textA, textB) {
  const a = resolvedSet(textA);
  const b = resolvedSet(textB);
  const only = (x, y) => [...x].filter((k) => !y.has(k)).sort();
  return { sizeA: a.size, sizeB: b.size, onlyA: only(a, b), onlyB: only(b, a) };
}

function main() {
  const [pathA, pathB] = process.argv.slice(2);
  if (!pathA || !pathB) {
    console.error("Usage: node scripts/lock-parity.js <yarn.lock A> <yarn.lock B>");
    process.exit(2);
  }

  const textA = fs.readFileSync(pathA, "utf8");
  const textB = fs.readFileSync(pathB, "utf8");
  const { sizeA, sizeB, onlyA, onlyB } = compareLocks(textA, textB);
  const list = (items) => items.map((k) => `\n  ${k}`).join("");

  console.log(`A (${parseLock(textA).format}) ${pathA}: ${sizeA} name@version`);
  console.log(`B (${parseLock(textB).format}) ${pathB}: ${sizeB} name@version`);
  console.log(`only in A (${onlyA.length}):${list(onlyA)}`);
  console.log(`only in B (${onlyB.length}):${list(onlyB)}`);
  process.exit(onlyA.length || onlyB.length ? 1 : 0);
}

if (require.main === module) main();

module.exports = { compareLocks };
