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
      :comments="local.comments"
      :pagination="local.pagination"
      :read-only="isReadOnly"
      :highlighted-comment-id="highlightedCommentId"
      @create="handleCreate"
      @reply="handleReply"
      @edit="handleEdit"
      @like="handleLike"
      @unlike="handleUnlike"
      @delete="handleDelete"
      @load="handleLoad"
      @load-more="handleLoadMore"
      @write="handleWriteAttempt"
      @highlight-dismiss="dismissHighlight"
    />
    <Empty
      v-if="!isLoading && pagination.count === 0"
      icon="lucide:message-circle-dashed"
      title="Looks like there are no comments yet."
      description="Be the first to start the discussion."
    >
      <UButton color="primary" variant="outline" size="sm" @click="handleWriteAttempt"> Write a comment </UButton>
    </Empty>
  </template>
</template>

<script lang="ts" setup>
import { findCommentById, insertReply, removeCommentById, updateCommentById } from "./comment-tree";
import { COMMENT_TREE_DEFAULTS } from "./types";
import type { Comment, CommentAuthor, CommentPagination } from "./types";
import type {
  CommentsPayload,
  CommentSort,
  CommentsSource,
} from "~/composables/comments/useComments";
import {
  commentsApiBase,
  fetchComment,
  fetchModelComments,
} from "~/composables/comments/useComments";

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

const { comments, pagination, status, refresh } = useComments(source, () => props.sort);

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

const toast = useToast();
const apiBase = commentsApiBase();
const mutations = useCommentMutations(() => props.modelId ?? "");

const notifyFailure = () =>
  toast.add({
    title: "Something went wrong",
    description: "Your change could not be saved. Please try again.",
    color: "error",
    icon: "i-lucide-triangle-alert",
  });

const busy = ref(false);
const runOptimistic = async (apply: () => void, persist: () => Promise<void>) => {
  if (busy.value) return;
  busy.value = true;
  const snapshot = { comments: local.comments, pagination: { ...local.pagination } };
  try {
    apply();
    await persist();
  } catch {
    local.comments = snapshot.comments;
    local.pagination = snapshot.pagination;
    notifyFailure();
  } finally {
    busy.value = false;
  }
};

const swapLocalId = (temporaryId: string, id: string) => {
  local.comments = updateCommentById(local.comments, temporaryId, (comment) => ({
    ...comment,
    id,
  }));
};

const handleCreate = ({ content }: { content: string }) => {
  const author = commentAuthor.value;
  if (!author) return;
  const optimistic = makeLocalComment(content, author);
  runOptimistic(
    () => {
      local.comments = [optimistic, ...local.comments];
      local.pagination = { ...local.pagination, count: local.pagination.count + 1 };
    },
    async () => {
      const { id } = await mutations.create({ content });
      swapLocalId(optimistic.id, id);
    },
  );
};

const handleReply = ({ commentId, content }: { commentId: string; content: string }) => {
  const author = commentAuthor.value;
  if (!author) return;
  const optimistic = { ...makeLocalComment(content, author), parentId: commentId };
  runOptimistic(
    () => {
      local.comments = insertReply(local.comments, commentId, optimistic);
    },
    async () => {
      const { id } = await mutations.create({ content, parentId: commentId });
      swapLocalId(optimistic.id, id);
    },
  );
};

const handleEdit = ({ commentId, content }: { commentId: string; content: string }) => {
  runOptimistic(
    () => {
      local.comments = updateCommentById(local.comments, commentId, (comment) => ({
        ...comment,
        content,
        edited: true,
      }));
    },
    () => mutations.edit({ commentId, content }),
  );
};

const handleLike = ({ commentId }: { commentId: string }) => {
  runOptimistic(
    () => {
      local.comments = updateCommentById(local.comments, commentId, (comment) => ({
        ...comment,
        likes: comment.likes + 1,
        likedByMe: true,
      }));
    },
    () => mutations.like({ commentId }),
  );
};

const handleUnlike = ({ commentId }: { commentId: string }) => {
  runOptimistic(
    () => {
      local.comments = updateCommentById(local.comments, commentId, (comment) => ({
        ...comment,
        likes: Math.max(0, comment.likes - 1),
        likedByMe: false,
      }));
    },
    () => mutations.unlike({ commentId }),
  );
};

const handleDelete = ({ commentId }: { commentId: string }) => {
  const wasTopLevel = local.comments.some((comment) => comment.id === commentId);
  runOptimistic(
    () => {
      local.comments = removeCommentById(local.comments, commentId);
      if (wasTopLevel) {
        local.pagination = {
          ...local.pagination,
          count: Math.max(0, local.pagination.count - 1),
        };
      }
    },
    () => mutations.remove({ commentId }),
  );
};

// Replies always read chronologically, so paging a node's replies keeps the
// default (createdAt) order rather than the top-level sort.
const handleLoad = async ({ commentId }: { commentId: string }) => {
  if (busy.value || !props.modelId) return;
  const target = findCommentById(local.comments, commentId);
  if (!target) return;
  busy.value = true;
  try {
    const nextPage = (target.replyPagination?.lastPage ?? 0) + 1;
    const root = await fetchComment(apiBase, props.modelId, commentId, {
      page: nextPage,
      limit: COMMENT_TREE_DEFAULTS.maximumShownRepliesPerLevel,
    });
    if (!root) return;
    const fetched = root.replies ?? [];
    local.comments = updateCommentById(local.comments, commentId, (comment) => {
      const seen = new Set((comment.replies ?? []).map((reply) => reply.id));
      const added = fetched.filter((reply) => !seen.has(reply.id));
      return {
        ...comment,
        replies: [...(comment.replies ?? []), ...added],
        replyPagination: {
          count: root.replyPagination?.count ?? comment.replyPagination?.count ?? 0,
          lastPage: nextPage,
        },
      };
    });
  } catch {
    notifyFailure();
  } finally {
    busy.value = false;
  }
};

const handleLoadMore = async (current: CommentPagination) => {
  if (busy.value || !props.modelId) return;
  busy.value = true;
  try {
    const next = await fetchModelComments(apiBase, props.modelId, {
      page: current.lastPage + 1,
      sort: props.sort,
    });
    const seen = new Set(local.comments.map((comment) => comment.id));
    const added = next.comments.filter((comment) => !seen.has(comment.id));
    local.comments = [...local.comments, ...added];
    local.pagination = next.pagination;
  } catch {
    notifyFailure();
  } finally {
    busy.value = false;
  }
};
</script>
