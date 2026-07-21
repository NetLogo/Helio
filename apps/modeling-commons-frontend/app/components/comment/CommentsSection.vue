<template>
  <template v-if="hasSource">
    <div v-if="isLoading" class="flex flex-col gap-8" data-testid="comments-loading">
      <div v-for="row in 3" :key="row" class="flex gap-4">
        <USkeleton class="size-11 rounded-full" />
        <div class="flex flex-1 flex-col gap-2">
          <USkeleton class="h-4 w-40" />
          <USkeleton class="h-14 w-full" />
        </div>
      </div>
    </div>
    <UAlert
      v-else-if="status === 'error'"
      color="error"
      variant="subtle"
      icon="i-lucide-message-circle-off"
      title="Comments failed to load"
      description="Something went wrong while loading the discussion."
      :actions="[{ label: 'Retry', color: 'error', variant: 'outline', onClick: () => refresh() }]"
    />
    <CommentsPanel
      v-else
      :comments="comments"
      :pagination="pagination"
      :read-only="isReadOnly"
      :highlighted-comment-id="highlightedCommentId"
      :pending="pending"
      :submit-token="submitToken"
      @create="create"
      @reply="reply"
      @edit="edit"
      @like="like"
      @unlike="unlike"
      @delete="remove"
      @load="loadReplies"
      @load-more="loadMore"
      @write="handleWriteAttempt"
      @highlight-dismiss="dismissHighlight"
    />
    <Empty
      v-if="!isLoading && pagination.count === 0 && comments.length === 0"
      icon="lucide:message-circle-dashed"
      title="Looks like there are no comments yet."
      description="Be the first to start the discussion."
    >
      <UButton color="primary" variant="outline" size="sm" @click="handleWriteAttempt"> Write a comment </UButton>
    </Empty>
  </template>
</template>

<script lang="ts" setup>
import type { CommentSort, CommentsSource } from "~/composables/comments/useComments";

const props = defineProps<{
  modelId?: string;
  commentId?: string;
  readOnly?: boolean;
  sort?: CommentSort;
}>();

const hasSource = computed(() => Boolean(props.modelId));

if (import.meta.dev && !hasSource.value) {
  console.warn("[CommentsSection] a modelId is required");
}

const source = computed<CommentsSource>(() => ({
  modelId: props.modelId ?? "",
  commentId: props.commentId,
}));

const {
  comments,
  pagination,
  status,
  refresh,
  pending,
  submitToken,
  create,
  reply,
  edit,
  like,
  unlike,
  remove,
  loadReplies,
  loadMore,
} = useCommentThread({ source, sort: () => props.sort });

const isLoading = computed(() => status.value === "pending" || status.value === "idle");

const user = useUser();
const isReadOnly = computed(() => props.readOnly || !user.value.isLoggedIn);
const handleWriteAttempt = () => {
  if (!user.value.isLoggedIn) {
    showRequiresLoginToast("participate in discussions");
  }
};

const route = useRoute();
const router = useRouter();

const initialHighlightId = route.query.highlightedCommentId;
const highlightedCommentId = ref(
  typeof initialHighlightId === "string" && initialHighlightId !== ""
    ? initialHighlightId
    : undefined,
);

const dismissHighlight = () => {
  if (!highlightedCommentId.value) return;
  highlightedCommentId.value = undefined;
  const query = { ...route.query };
  delete query.highlightedCommentId;
  router.replace({ query });
};
</script>
