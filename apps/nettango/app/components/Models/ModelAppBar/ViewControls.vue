<template>
  <div class="flex shrink-0 items-center gap-1 max-sm:hidden">
    <USeparator orientation="vertical" class="mx-1 h-5" />
    <UButton
      :to="TUTORIAL_PATH"
      color="neutral"
      variant="ghost"
      icon="i-lucide-graduation-cap"
      label="Tutorial"
      :ui="{ label: 'max-lg:sr-only' }"
    />
    <div v-if="!studentMode" class="contents" data-teacher-only>
      <USeparator orientation="vertical" class="mx-1 h-5" />
      <UTooltip :text="sidebarLabel">
        <UButton
          color="neutral"
          variant="ghost"
          square
          :aria-label="sidebarLabel"
          :aria-pressed="sidebarVisible"
          @click="$emit('toggleSidebar')"
        >
          <UIcon :name="sidebarIcons.desktop" class="size-5 max-lg:hidden" />
          <UIcon :name="sidebarIcons.compact" class="size-5 lg:hidden" />
        </UButton>
      </UTooltip>
      <UTooltip text="Swap sides">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left-right"
          aria-label="Swap sides"
          :aria-pressed="swapped"
          :ui="{ leadingIcon: 'max-lg:rotate-90' }"
          @click="$emit('swap')"
        />
      </UTooltip>
      <UTooltip text="Reset split">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-columns-2"
          aria-label="Reset split"
          class="max-lg:hidden"
          @click="$emit('resetSplit')"
        />
      </UTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  studentMode?: boolean;
  sidebarLabel: string;
  sidebarVisible: boolean;
  sidebarIcons: { desktop: string; compact: string };
  swapped: boolean;
}>();

defineEmits<{ toggleSidebar: []; swap: []; resetSplit: [] }>();
</script>
