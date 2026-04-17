<script setup lang="ts">
import { UTable } from "#components";
import { deepMerge } from "@repo/utils/std/objects";
import type { ComponentProps } from "@repo/vue-ui/utils";

type UTableUIProp = NonNullable<ComponentProps<typeof UTable>["ui"]>;
defineOptions({ inheritAttrs: false });
const props = defineProps<{ ui?: UTableUIProp }>();
const stripedUi = {
  tbody: "bg-white [&_tr:nth-child(even)]:bg-page-bg",
  tr: "hover:bg-royal-blue-lightest data-[state=selected]:bg-neutral-lightest",
} as const;
</script>

<template>
  <UTable
    v-bind="$attrs"
    :ui="deepMerge<typeof stripedUi, UTableUIProp>(stripedUi, props.ui ?? {})"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>
  </UTable>
</template>
