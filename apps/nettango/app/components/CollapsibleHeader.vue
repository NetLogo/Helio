<template>
  <UCollapsible
    class="gap-2 w-full lg:hidden"
    :ui="{ root: '[&_button]:py-5 [&_button]:rounded-none [&_button]:hover:bg-white' }"
  >
    <UButton
      :label
      color="neutral"
      variant="subtle"
      trailing-icon="i-lucide-chevron-down"
      block
      class="px-(--space-xl)"
    />

    <template #content>
      <div class="overflow-y-auto max-h-[70vh]">
        <slot />
      </div>
    </template>
  </UCollapsible>
</template>

<script setup lang="ts">
type Props = {
  label: string;
};

defineProps<Props>();
</script>
