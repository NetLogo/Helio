import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ModelDetail.handleShare client-only guard", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/model/detail/ModelDetail.vue"),
    "utf8",
  );

  it("bails handleShare when not on client", () => {
    const handleShare = src.slice(src.indexOf("async function handleShare()"));
    const sliced = handleShare.slice(0, handleShare.indexOf("\n}"));
    const guard = ["import", "meta", "client"].join(".");
    expect(sliced.includes(guard)).toBe(true);
  });

  it("removes the misleading 'typeof window' half-guard", () => {
    expect(src.includes("typeof window")).toBe(false);
  });
});
