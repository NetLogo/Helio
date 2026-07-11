<template>
  <div
    ref="rootEl"
    :data-comment-id="comment.id"
    class="flex gap-4 group/reply"
    :class="isHighlighted ? 'rounded-lg bg-primary/5 ring-2 ring-primary/30 outline-none p-2 -m-2' : undefined"
    :tabindex="isHighlighted ? -1 : undefined"
    @focusout="handleFocusOut"
  >
    <div class="relative">
      <!-- Spine and its parts -->
      <CommentElbowSvg
        v-if="isNested"
        class="absolute -top-5 -left-9 translate-x-0.5 text-gray-300"
      />
      <CommentSpine v-if="hasSpine && !isCollapsed" />
      <CommentSpineEraser v-if="isNested && isLastSibling && !parentHasSeeMoreReplies" />

      <!-- Avatar as anchor -->
      <NuxtLink v-if="comment.author.url" :to="comment.author.url" class="contents">
        <UAvatar
          :src="comment.author.image"
          :alt="comment.author.name"
          size="lg"
          class="self-start my-1"
        />
      </NuxtLink>
      <UAvatar
        v-else
        :src="comment.author.image"
        :alt="comment.author.name"
        size="lg"
        class="self-start my-1"
      />
    </div>

    <div class="flex-1 flex flex-col gap-1">
      <CommentMetadataBar
        :author="comment.author"
        :created-at="comment.createdAt"
        :thread-link="threadLink ?? undefined"
        :edited="comment.edited"
        collapsible
        :collapsed="isCollapsed"
        :hidden-reply-count="comment.replyPagination?.count ?? 0"
        @toggle-collapse="toggleCollapse"
      />

      <template v-if="!isCollapsed">
        <CommentInput
          v-if="isEditing"
          :id="`edit-${comment.id}`"
          :initial-text="comment.content"
          :target="parentAuthorName"
          is-editing
          @cancel="closeEditMode"
          @submit="submitCommentEdit"
        />
        <div v-else class="leading-7 text-gray-800">
          <CommentTextRepresentation :text="comment.content" />
        </div>

        <CommentActions
          class="mb-2"
          :likes="comment.likes"
          :reply-count="comment.replyPagination?.count ?? 0"
          :liked-by-me="comment.likedByMe ?? false"
          :can-edit="comment.permissions?.canEdit ?? false"
          :can-delete="comment.permissions?.canDelete ?? false"
          @reply="toggleReplyInput"
          @edit="toggleEditMode"
          @like="handleLike"
          @delete="handleDelete"
        />

        <div v-if="isReplyInputVisible" class="mt-3 mb-5">
          <CommentInput
            :id="`reply-to-${comment.id}`"
            :target="comment.author.name"
            @cancel="closeReplyInput"
            @submit="submitCommentReply"
          />
        </div>

        <!-- Replies -->
        <div v-if="hasVisibleReplies" class="relative w-full">
          <CommentView
            v-for="(reply, index) in shownReplies"
            :key="reply.id"
            :comment="reply"
            :parent-author-name="comment.author.name"
            :maximum-nested="maximumNested - 1"
            :maximum-shown-replies-per-level="maximumShownRepliesPerLevel"
            is-nested
            :parent-has-see-more-replies="remainingReplies > 0"
            :is-last-sibling="index === shownReplies.length - 1"
            :read-only="readOnly"
            :highlighted-comment-id="highlightedCommentId"
            @reply="emit('reply', $event)"
            @edit="emit('edit', $event)"
            @like="emit('like', $event)"
            @unlike="emit('unlike', $event)"
            @delete="emit('delete', $event)"
            @load="emit('load', $event)"
            @write="emit('write')"
            @highlight-dismiss="emit('highlight-dismiss')"
          />
        </div>

        <!-- See more / continue thread -->
        <div
          v-if="remainingReplies > 0 && (!atNestingLimit || threadLink)"
          class="text-sm text-gray-500 hover:text-gray-700 cursor-pointer transition-colors duration-200 relative"
        >
          <CommentSpineEraser class="left-0 -translate-x-11 top-0 w-6 block h-10" />

          <CommentElbowSvg
            class="absolute top-0 -translate-y-1/2 -left-9 translate-x-0.5 text-gray-300"
          />

          <UButton
            v-if="atNestingLimit && threadLink"
            data-testid="continue-thread-link"
            :to="threadLink"
            variant="link"
            size="xs"
            color="neutral"
            class="pt-2 pb-4 ml-2 underline"
          >
            {{ continueThreadCopy }}
          </UButton>
          <CommentSeeMore
            v-else
            :reply-count="remainingReplies"
            @see-more-replies="handleSeeMoreReplies"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as commentTree from "./comment-tree";
import { COMMENT_TREE_DEFAULTS } from "./types";
import type { CommentViewProps } from "./types";

const props = withDefaults(defineProps<CommentViewProps>(), {
  maximumNested: COMMENT_TREE_DEFAULTS.maximumNested,
  maximumShownRepliesPerLevel: COMMENT_TREE_DEFAULTS.maximumShownRepliesPerLevel,
  isNested: false,
  parentHasSeeMoreReplies: false,
  isLastSibling: false,
  readOnly: false,
});

const emit = defineEmits<{
  reply: [
    {
      commentId: string;
      content: string;
    },
  ];
  edit: [
    {
      commentId: string;
      content: string;
    },
  ];
  like: [{ commentId: string }];
  unlike: [{ commentId: string }];
  delete: [{ commentId: string }];
  load: [{ commentId: string }];
  write: [];
  "highlight-dismiss": [];
}>();

const rootEl = ref<HTMLElement | null>(null);
const isHighlighted = computed(() => props.highlightedCommentId === props.comment.id);

onMounted(() => {
  if (!isHighlighted.value || !rootEl.value) return;
  rootEl.value.scrollIntoView({ block: "center" });
  rootEl.value.focus({ preventScroll: true });
});

const handleFocusOut = () => {
  if (isHighlighted.value) emit("highlight-dismiss");
};

const revealedCount = ref(props.maximumShownRepliesPerLevel);

const shownReplies = computed(() =>
  commentTree.visibleReplies(props.comment, revealedCount.value),
);

const remainingReplies = computed(() =>
  commentTree.remainingReplyCount(props.comment, revealedCount.value, props.maximumNested),
);

const hasVisibleReplies = computed(() =>
  commentTree.hasVisibleReplies(props.comment, props.maximumNested),
);
const hasSpine = computed(() =>
  commentTree.hasSpine(props.comment, revealedCount.value, props.maximumNested),
);

const handleSeeMoreReplies = () => {
  if (commentTree.hiddenLoadedReplyCount(props.comment, revealedCount.value) > 0) {
    revealedCount.value = (props.comment.replies ?? []).length;
    return;
  }
  emit("load", { commentId: props.comment.id });
};

const atNestingLimit = computed(() => props.maximumNested <= 0);
const threadLink = computed(() =>
  props.comment.modelId ? `/models/${props.comment.modelId}/comments/${props.comment.id}` : null,
);
const continueThreadCopy = computed(() => {
  const count = remainingReplies.value;
  return `Continue this thread (${count} ${count === 1 ? "reply" : "replies"})`;
});

const isCollapsed = ref(false);
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const isReplyInputVisible = ref(false);
const closeReplyInput = () => {
  isReplyInputVisible.value = false;
};
const toggleReplyInput = () => {
  if (isReplyInputVisible.value) {
    closeReplyInput();
    return;
  }
  emit("write");
  if (props.readOnly) return;
  isReplyInputVisible.value = true;
};

const isEditing = ref(false);
const closeEditMode = () => {
  isEditing.value = false;
};
const toggleEditMode = () => {
  if (isEditing.value) {
    closeEditMode();
    return;
  }
  emit("write");
  if (props.readOnly) return;
  isEditing.value = true;
};

const submitCommentEdit = (newContent: string) => {
  emit("edit", { commentId: props.comment.id, content: newContent });
  closeEditMode();
};

const submitCommentReply = (replyContent: string) => {
  emit("reply", { commentId: props.comment.id, content: replyContent });
  closeReplyInput();
};

const handleLike = () => {
  emit("write");
  if (props.readOnly) return;
  if (props.comment.likedByMe) {
    emit("unlike", { commentId: props.comment.id });
  } else {
    emit("like", { commentId: props.comment.id });
  }
};

const handleDelete = () => {
  emit("write");
  if (props.readOnly) return;
  emit("delete", { commentId: props.comment.id });
};
</script>
