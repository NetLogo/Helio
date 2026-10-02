<template>
  <figure class="overflow-hidden rounded-t-xl bg-default shadow-screen ring-1 ring-default">
    <div
      aria-hidden="true"
      class="grid grid-cols-[1fr_minmax(0,3fr)_1fr] items-center gap-4 border-b border-default bg-elevated px-4 py-2.5 text-dimmed"
    >
      <div class="flex items-center gap-4">
        <div class="flex gap-2">
          <span class="size-3 rounded-full bg-traffic-close" />
          <span class="size-3 rounded-full bg-traffic-minimize" />
          <span class="size-3 rounded-full bg-traffic-zoom" />
        </div>
        <UIcon name="i-lucide-panel-left" class="hidden size-4 sm:block" />
        <div class="hidden gap-3 sm:flex">
          <UIcon name="i-lucide-chevron-left" class="size-4" />
          <UIcon name="i-lucide-chevron-right" class="size-4" />
        </div>
      </div>
      <div class="flex min-w-0 items-center gap-2 rounded-lg bg-accented/60 px-3 py-1.5 text-xs">
        <UIcon name="i-lucide-lock" class="size-3 shrink-0" />
        <span class="flex-1 truncate text-center text-muted">{{ url }}</span>
        <UIcon name="i-lucide-rotate-cw" class="size-3 shrink-0" />
      </div>
      <div class="flex items-center justify-end gap-4">
        <UIcon name="i-lucide-share" class="hidden size-4 sm:block" />
        <UIcon name="i-lucide-plus" class="hidden size-4 sm:block" />
        <UIcon name="i-lucide-copy" class="size-4" />
      </div>
    </div>
    <div class="bg-screen-glow">
      <slot />
    </div>
  </figure>
</template>

<script setup lang="ts">
defineProps<{ url: string }>();
</script>
