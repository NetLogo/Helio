import type { NtBlockColor, NtBlockSize } from "../components/Nt/NtBlock.vue";

export interface NtBlockSpec {
  color: NtBlockColor;
  label: string;
  param?: string;
  children?: NtBlockSpec[];
}

export interface IndexedBlockSpec extends NtBlockSpec {
  index: number;
  nodes: IndexedBlockSpec[];
}

export const indexBlocks = (blocks: NtBlockSpec[]): IndexedBlockSpec[] => {
  let next = 0;
  const assign = (specs: NtBlockSpec[]): IndexedBlockSpec[] =>
    specs.map((spec) => {
      const index = next++;
      return { ...spec, index, nodes: assign(spec.children ?? []) };
    });
  return assign(blocks);
};

// Red is the only colour with display tokens; other colours keep their md palette at display size.
export const getBlockTokenKey = (color: NtBlockColor, size: NtBlockSize): NtBlockColor | "display" =>
  color === "red" && size === "display" ? "display" : color;
