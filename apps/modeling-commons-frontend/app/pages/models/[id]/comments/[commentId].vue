<template>
  <UContainer class="py-10 max-w-3xl">
    <div class="space-y-6">
      <div class="space-y-2">
        <div class="flex items-center gap-4">
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
          <UButton
            v-if="parentThreadLink"
            data-testid="parent-thread-link"
            variant="link"
            color="neutral"
            size="xs"
            icon="i-lucide-corner-left-up"
            class="px-0"
            :to="parentThreadLink"
          >
            See parent thread
          </UButton>
        </div>
        <h4 class="tracking-tight">Comment thread</h4>
        <p data-testid="thread-subtitle" class="text-sm text-muted">{{ subtitle }}</p>
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

const { comments } = useComments(() => ({ commentId: commentId.value }));
const threadRoot = computed(() => comments.value[0]);

const parentThreadLink = computed(() =>
  threadRoot.value?.parentId
    ? `/models/${modelId.value}/comments/${threadRoot.value.parentId}`
    : null,
);

const subtitle = computed(() =>
  threadRoot.value
    ? `The full conversation under ${threadRoot.value.author.name}'s comment.`
    : "A single discussion thread, shown in full.",
);
</script>
