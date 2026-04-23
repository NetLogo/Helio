<script setup lang="ts" generic="T">
import { UTable } from "#components";
import { deepMerge } from "@repo/utils/std/objects";
import type { ComponentProps, ComponentSlots } from "@repo/vue-ui/utils";

type UTableUIProp = NonNullable<ComponentProps<typeof UTable>["ui"]>;
const props = defineProps<{ data: T[]; ui?: UTableUIProp }>();
const stripedUi = {
  tbody: "bg-white [&_tr:nth-child(even)]:bg-page-bg",
  tr: "hover:bg-royal-blue-lightest data-[state=selected]:bg-neutral-lightest",
} as const;

type Slots = NonNullable<ComponentSlots<typeof UTable<T>>>;
defineSlots<Slots>();
</script>

<template>
  <UTable
    :ui="deepMerge<typeof stripedUi, UTableUIProp>(stripedUi, props.ui ?? {})"
    :data="props.data"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>
  </UTable>
</template>
