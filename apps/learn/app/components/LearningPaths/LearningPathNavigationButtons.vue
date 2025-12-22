<template>
  <UPageHeader
    :ui="{
      root: 'pt-5 pb-4 pr-[var(--space-md)] m-0 flex',
      container: 'flex flex-row px-[var(--space-md)] lg:px-0 gap-3 w-full justify-end',
    }"
  >
    <UButton
      variant="outline"
      size="md"
      :to="myself.previous ? `${addLeadingSlash(myself.previous.path)}` : undefined"
      :disabled="!myself.previous"
      aria-label="Previous Article"
    >
      <Icon name="i-lucide-chevron-left" class="inline-block" />
      Previous <span class="hidden lg:inline">Article</span>
    </UButton>
    <UButton
      size="md"
      :to="myself.next ? `${addLeadingSlash(myself.next.path)}` : undefined"
      :disabled="!myself.next"
      aria-label="Next Article"
    >
      <Icon name="i-lucide-chevron-right" class="inline-block" />
      Next <span class="hidden lg:inline">Article</span>
    </UButton>
    <UButton
      variant="outline"
      size="md"
      class="lg:ml-auto"
      :color="myself.completed ? 'error' : 'primary'"
      :aria-label="myself.completed ? 'Mark as Not Completed' : 'Mark as Completed'"
      @click="markCompleted(myself.articlePath, !myself.completed)"
    >
      <Icon :name="myself.completed ? 'i-lucide-circle-minus' : 'i-lucide-circle-check'" class="inline-block" />
      <span class="hidden lg:inline">{{ myself.completed ? 'Mark as Not Completed' : 'Mark as Completed' }}</span>
      <span class="lg:hidden line-clamp-1 truncate">{{ myself.completed ? 'Not Completed' : 'Completed' }}</span>
    </UButton>
  </UPageHeader>
</template>

<script lang="ts" setup>
type Props = {
  myself: LearningPathSelf;
  markCompleted: (articlePath: string, completed?: boolean) => void;
};
defineProps<Props>();
</script>
