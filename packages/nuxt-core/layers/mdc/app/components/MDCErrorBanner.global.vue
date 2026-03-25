<template>
  <p
    class="inline-flex [.prose>&]:mx-[var(--space-xl)] items-center px-2 py-1 gap-2 bg-yellow-200 text-gray-800 font-mono text-left break-words rounded"
  >
    <span
      class="inline-flex items-center justify-center px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full"
    >
      <Icon :name="icon ?? 'i-lucide-hand'" />
    </span>
    <slot mdc-unwrap="p" />
  </p>
</template>

<script lang="ts" setup>
type Props = {
  icon?: string;
};
defineProps<Props>();
</script>
