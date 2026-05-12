<template>
  <NuxtLink
    v-if="href"
    :to="href"
    class="inline-flex items-center rounded px-2.5 py-1 text-xs font-medium max-w-sm whitespace-nowrap overflow-hidden text-ellipsis hover:opacity-80 transition-opacity"
    :class="getTagColorClass(name)"
  >
    {{ label }}
  </NuxtLink>
  <span
    v-else
    class="inline-flex items-center rounded px-2.5 py-1 text-xs font-medium max-w-sm whitespace-nowrap overflow-hidden text-ellipsis"
    :class="getTagColorClass(name)"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { createSlugPath, getTagColorClass, sentenceCase } from "~/utils/formatters";

const props = defineProps<{
  id?: string;
  name: string;
  displayName?: string;
}>();

const label = computed(() =>
  props.displayName && props.displayName.length > 0
    ? props.displayName
    : sentenceCase(props.name),
);

const href = computed(() => (props.id ? createSlugPath("tags", props.id, props.name) : null));
</script>
