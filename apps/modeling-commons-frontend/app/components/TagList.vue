<template>
  <div class="flex flex-wrap gap-2">
    <span
      v-for="tag in tags"
      :key="tag.id"
      class="inline-flex items-center rounded px-3 py-1 text-xs font-medium border"
      :class="getTagColorClass(tag.name)"
    >
      {{ tag.name }}
    </span>
    <button
      v-if="editable"
      class="inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-medium border border-dashed border-default text-muted hover:border-accented hover:text-toned transition-colors"
      @click="$emit('add')"
    >
      <UIcon name="i-lucide-plus" class="size-3" />
      Add Tag
    </button>
  </div>
</template>

<script setup lang="ts">
import { getTagColorClass } from "~/utils/formatters";

defineProps<{
  tags: { id: string; name: string }[];
  editable?: boolean;
}>();

defineEmits<{
  add: [];
}>();
</script>
