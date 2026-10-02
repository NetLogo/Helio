import type { NtBlockColor } from "../components/Nt/NtBlock.vue";

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
