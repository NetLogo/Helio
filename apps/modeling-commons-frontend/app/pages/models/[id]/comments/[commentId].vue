<template>
  <UContainer class="py-10 max-w-3xl">
    <div class="space-y-6">
      <div class="space-y-2">
        <UButton
          variant="link"
          color="neutral"
          size="xs"
          icon="i-lucide-arrow-left"
          class="px-0"
          :to="`/models/${modelId}`"
        >
          Back to model
        </UButton>
        <h4 class="tracking-tight">Comment thread</h4>
        <p class="text-sm text-muted">A single discussion thread, shown in full.</p>
      </div>
      <CommentsSection :comment-id="commentId" />
    </div>
  </UContainer>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Comment Thread",
});

const route = useRoute();
const modelId = computed(() => String(route.params.id ?? ""));
const commentId = computed(() => String(route.params.commentId ?? ""));
</script>
