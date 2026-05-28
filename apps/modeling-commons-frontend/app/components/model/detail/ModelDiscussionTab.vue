<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-highlighted">Discussion</h3>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-muted">Filter Comments By</span>
        <USelectMenu :items="filterOptions" :model-value="filterOptions[0]" class="w-32" />
      </div>
    </div>

    <div class="flex flex-col items-center justify-center py-12 text-dimmed">
      <UIcon name="i-lucide-message-circle" class="size-12 mb-3" />
      <p class="text-sm font-medium">Discussions are coming soon!</p>
      <p class="text-xs mt-1">In the meantime, if you have any questions or feedback about this model, please reach out to the author.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const filterOptions = [
  { label: "Type", value: "type" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
];
</script>
