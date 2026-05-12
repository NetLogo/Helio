<template>
  <span
    class="inline-flex items-center rounded px-2.5 py-1 text-xs font-medium max-w-sm whitespace-nowrap overflow-hidden text-ellipsis"
    :class="getTagColorClass(tag.name)"
  >
    {{ sentenceCase(tag.name) }}
  </span>
</template>

<script setup lang="ts">
import { getTagColorClass } from "~/utils/formatters";

defineProps<{
  tag: Partial<Tag> & { name: string };
}>();
</script>
