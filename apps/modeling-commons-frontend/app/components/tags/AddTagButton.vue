<template>
  <button
    class="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium border border-dashed border-default text-muted hover:border-accented hover:text-toned transition-colors"
    @click="$emit('add')"
  >
    <UIcon name="i-lucide-plus" class="size-3" />
    {{ ctaLabel }} <span v-if="name">"{{ name }}"</span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    name?: string;
    ctaLabel?: string;
  }>(),
  {
    name: undefined,
    ctaLabel: "Add Tag",
  },
);
defineEmits<{
  add: [];
}>();
</script>
