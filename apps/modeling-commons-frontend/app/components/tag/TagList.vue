<template>
  <div class="flex flex-wrap gap-2.5">
    <span
      v-for="tag in tags"
      :key="tag.id"
      class="inline-flex items-center rounded px-2.5 py-1 text-xs font-medium max-w-sm whitespace-nowrap overflow-hidden text-ellipsis"
      :class="getTagColorClass(tag.name)"
    >
      {{ sentenceCase(tag.name) }}
    </span>
    <AddTagButton v-if="editable" @add="$emit('add')" />
  </div>
</template>

<script setup lang="ts">
import { getTagColorClass } from "~/utils/formatters";

defineProps<{
  tags: Array<Tag>;

  editable?: boolean;
}>();

defineEmits<{
  add: [];
}>();
</script>
