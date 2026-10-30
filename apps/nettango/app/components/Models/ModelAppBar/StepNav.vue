<template>
  <div
    class="flex shrink-0 items-center max-sm:hidden"
    role="group"
    :aria-label="`${title} sequence`"
  >
    <UTooltip :text="links.previous.tooltip">
      <UButton
        :to="links.previous.to"
        :disabled="links.previous.disabled"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-chevron-left"
        :aria-label="links.previous.label"
      />
    </UTooltip>
    <span class="px-1 text-xs text-muted tabular-nums max-lg:sr-only">
      Step {{ step }} of {{ total }}
    </span>
    <UTooltip :text="links.next.tooltip">
      <UButton
        :to="links.next.to"
        :disabled="links.next.disabled"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-chevron-right"
        :aria-label="links.next.label"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
import type { StepLinks } from "./helpers";

defineProps<{ title: string; step: number; total: number; links: StepLinks }>();
</script>
