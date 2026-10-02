<template>
  <div class="nt-stack" :class="{ 'rotate-tilt': tilt }">
    <NtBlockStackNode v-for="(node, i) in nodes" :key="i" :node="node" />
  </div>
</template>

<script setup lang="ts">
import type { FunctionalComponent } from "vue";
import type { IndexedBlockSpec, NtBlockSpec } from "~/utils/blockStack";
import NtBlock from "./NtBlock.vue";

const props = withDefaults(
  defineProps<{ blocks: NtBlockSpec[]; tilt?: boolean; motion?: "snap" | "none" }>(),
  { tilt: false, motion: "snap" },
);

const nodes = computed(() => indexBlocks(props.blocks));

const NtBlockStackNode: FunctionalComponent<{ node: IndexedBlockSpec }> = ({ node }) =>
  h(
    NtBlock,
    {
      color: node.color,
      label: node.label,
      param: node.param,
      index: node.index,
      motion: props.motion,
    },
    node.nodes.length
      ? { default: () => node.nodes.map((child) => h(NtBlockStackNode, { node: child, key: child.index })) }
      : undefined,
  );
</script>

<style scoped>
.nt-stack {
  display: flex;
  flex-direction: column;
  gap: 0.214em;
  font-size: 0.8rem;
  filter: drop-shadow(var(--drop-shadow-stack-sm)) drop-shadow(var(--drop-shadow-stack-md))
    drop-shadow(var(--drop-shadow-stack-lg));
}

.nt-stack > :deep(.nt-block > .nt-block__head) {
  font-weight: 700;
}

.nt-stack > :deep(.nt-block:first-child > .nt-block__head) {
  border-radius: var(--radius-block) var(--radius-block) 0 0;
  mask-image: none;
}

.nt-stack > :deep(.nt-block--c > .nt-block__body > .nt-block__arm) {
  width: 2.857em;
}

.nt-stack > :deep(.nt-block--c > .nt-block__body > .nt-block__children) {
  margin-right: -1.071em;
}

.nt-stack > :deep(.nt-block--c > .nt-block__foot) {
  height: 2.857em;
}
</style>
