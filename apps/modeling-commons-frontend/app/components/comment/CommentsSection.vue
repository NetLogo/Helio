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
      :actions="[
        { label: 'Retry', color: 'error', variant: 'outline', onClick: () => refresh() },
      ]"
    />
    <CommentsPanel
      v-else
      :comments="local.comments"
      :pagination="local.pagination"
      @create="handleCreate"
      @reply="handleReply"
      @edit="handleEdit"
      @like="handleLike"
      @unlike="handleUnlike"
      @delete="handleDelete"
      @load="handleLoad"
      @load-more="handleLoadMore"
    />
  </template>
</template>

<script lang="ts" setup>
import { insertReply, removeCommentById, updateCommentById } from "./comment-tree";
import type { Comment, CommentAuthor } from "./types";
import type { CommentsPayload, CommentsSource } from "~/composables/comments/useComments";

const props = defineProps<{
  modelId?: string;
  commentId?: string;
}>();

const hasSource = computed(() => Boolean(props.modelId || props.commentId));

if (import.meta.dev && (!hasSource.value || (props.modelId && props.commentId))) {
  console.warn("[CommentsSection] expected exactly one of modelId or commentId");
}

const source = computed<CommentsSource>(() =>
  props.modelId || !props.commentId
    ? { modelId: props.modelId ?? "" }
    : { commentId: props.commentId },
);

const { comments, pagination, status, refresh } = useComments(source);

const isLoading = computed(() => status.value === "pending" || status.value === "idle");

const snapshot = computed<CommentsPayload>(() => ({
  comments: comments.value,
  pagination: pagination.value,
}));

const local = reactive<CommentsPayload>({
  comments: [],
  pagination: { count: 0, lastPage: 0 },
});

watch(
  snapshot,
  (next) => {
    Object.assign(local, {
      comments: next.comments,
      pagination: { ...next.pagination },
    });
  },
  { immediate: true },
);

const { profile } = useProfile();
const commentAuthor = computed<CommentAuthor | null>(() =>
  profile.value ? { name: profile.value.name, image: profile.value.image ?? "" } : null,
);

let localIdCounter = 0;
const makeLocalComment = (content: string, author: CommentAuthor): Comment => ({
  id: `local-${++localIdCounter}`,
  author,
  content,
  createdAt: new Date().toISOString(),
  likes: 0,
  likedByMe: false,
  replies: [],
  replyPagination: { count: 0, lastPage: 0 },
  permissions: { canEdit: true, canDelete: true },
});

const busy = ref(false);
const runOptimistic = async (mutate: () => void) => {
  if (busy.value) return;
  busy.value = true;
  try {
    mutate();
    // TODO: once the backend exists, await the real API call here; on failure
    // restore the pre-mutation local.comments/local.pagination and toast.
  } finally {
    busy.value = false;
  }
};

// TODO: POST /api/v1/models/{id}/comments — swap the local id for the created one.
const handleCreate = ({ content }: { content: string }) => {
  const author = commentAuthor.value;
  if (!author) return;
  runOptimistic(() => {
    local.comments = [makeLocalComment(content, author), ...local.comments];
    local.pagination = { ...local.pagination, count: local.pagination.count + 1 };
  });
};

// TODO: POST /api/v1/comments/{id}/replies — swap the local id for the created one.
const handleReply = ({ commentId, content }: { commentId: string; content: string }) => {
  const author = commentAuthor.value;
  if (!author) return;
  runOptimistic(() => {
    local.comments = insertReply(local.comments, commentId, makeLocalComment(content, author));
  });
};

// TODO: PATCH /api/v1/comments/{id}
const handleEdit = ({ commentId, content }: { commentId: string; content: string }) => {
  runOptimistic(() => {
    local.comments = updateCommentById(local.comments, commentId, (comment) => ({
      ...comment,
      content,
      edited: true,
    }));
  });
};

// TODO: POST /api/v1/comments/{id}/like
const handleLike = ({ commentId }: { commentId: string }) => {
  runOptimistic(() => {
    local.comments = updateCommentById(local.comments, commentId, (comment) => ({
      ...comment,
      likes: comment.likes + 1,
      likedByMe: true,
    }));
  });
};

// TODO: DELETE /api/v1/comments/{id}/like
const handleUnlike = ({ commentId }: { commentId: string }) => {
  runOptimistic(() => {
    local.comments = updateCommentById(local.comments, commentId, (comment) => ({
      ...comment,
      likes: Math.max(0, comment.likes - 1),
      likedByMe: false,
    }));
  });
};

// TODO: DELETE /api/v1/comments/{id}
const handleDelete = ({ commentId }: { commentId: string }) => {
  runOptimistic(() => {
    const wasTopLevel = local.comments.some((comment) => comment.id === commentId);
    local.comments = removeCommentById(local.comments, commentId);
    if (wasTopLevel) {
      local.pagination = {
        ...local.pagination,
        count: Math.max(0, local.pagination.count - 1),
      };
    }
  });
};

// TODO: GET /api/v1/comments/{id}/replies?page=… — append the fetched replies to
// the target comment and advance its replyPagination. No backend to page from yet.
const handleLoad = (_event: { commentId: string }) => {};

// TODO: GET /api/v1/models/{id}/comments?page=… — append the next page to
// local.comments and advance local.pagination. No backend to page from yet.
const handleLoadMore = (_pagination: { count: number; lastPage: number }) => {};
</script>
