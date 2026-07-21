<template>
  <div class="flex flex-col gap-3">
    <ConfirmDeleteCommentDialog
      v-model:open="deleteOpen"
      :deleting="pending"
      @confirm="handleDelete"
      @cancel="cleanupDeleteEvent"
    />
    <CommentInput
      v-if="!readOnly"
      ref="composer"
      class="mb-5"
      :pending="pending"
      @submit="handleCreate"
      @cancel="handleCancel"
    />
    <CommentView
      v-for="comment in comments"
      :key="comment.id"
      :comment="comment"
      :maximum-nested="maximumNested"
      :maximum-shown-replies-per-level="maximumShownRepliesPerLevel"
      :is-nested="isNested"
      :parent-has-see-more-replies="parentHasSeeMoreReplies"
      :read-only="readOnly"
      :highlighted-comment-id="highlightedCommentId"
      :pending="pending"
      :submit-token="submitToken"
      @reply="emit('reply', $event)"
      @edit="emit('edit', $event)"
      @like="emit('like', $event)"
      @unlike="emit('unlike', $event)"
      @load="emit('load', $event)"
      @delete="confirmDelete"
      @write="emit('write')"
      @highlight-dismiss="emit('highlight-dismiss')"
    />
    <UButton
      v-if="remainingComments > 0"
      variant="soft"
      color="primary"
      size="xs"
      class="w-fit"
      @click="loadMoreComments"
    >
      Load {{ remainingComments }} more comment{{ remainingComments > 1 ? "s" : "" }}
    </UButton>
  </div>
</template>

<script lang="ts" setup>
import { remainingCommentCount } from "./comment-tree";
import { COMMENT_TREE_DEFAULTS } from "./types";
import type { CommentPagination, CommentsPanelProps } from "./types";

const props = withDefaults(defineProps<CommentsPanelProps>(), {
  maximumNested: COMMENT_TREE_DEFAULTS.maximumNested,
  maximumShownRepliesPerLevel: COMMENT_TREE_DEFAULTS.maximumShownRepliesPerLevel,
  isNested: false,
  parentHasSeeMoreReplies: false,
  readOnly: false,
  pending: false,
  submitToken: 0,
});

const emit = defineEmits<{
  create: [{ content: string }];
  reply: [{ commentId: string; content: string }];
  edit: [{ commentId: string; content: string }];
  like: [{ commentId: string }];
  unlike: [{ commentId: string }];
  delete: [{ commentId: string }];
  load: [{ commentId: string }];
  "load-more": [pagination: CommentPagination];
  write: [];
  "highlight-dismiss": [];
}>();

// The composer keeps the user's text until a submission actually succeeds, so a
// rejected create is not silently lost. It clears only when `submitToken`
// advances past the value captured at submit time.
const composer = ref<{ clear: () => void; focus: () => void } | null>(null);
const creating = ref(false);
let createToken = 0;
const handleCreate = (content: string) => {
  emit("create", { content });
  createToken = props.submitToken;
  creating.value = true;
};
const handleCancel = () => {
  composer.value?.clear();
};

// The composer only exists when not read-only; focusComposer is a no-op otherwise.
const focusComposer = () => {
  composer.value?.focus();
};

defineExpose({ focusComposer });

watch(
  () => props.submitToken,
  (token) => {
    if (creating.value && token !== createToken) {
      creating.value = false;
      composer.value?.clear();
    }
  },
);

const deleteOpen = ref(false);
const deleteTarget = ref<string | null>(null);
const handleDelete = () => {
  if (deleteTarget.value) emit("delete", { commentId: deleteTarget.value });
};
const confirmDelete = (event: { commentId: string }) => {
  deleteTarget.value = event.commentId;
  deleteOpen.value = true;
};
const cleanupDeleteEvent = () => {
  deleteTarget.value = null;
};

// Close the dialog and drop the failure latch once each submission settles.
watch(
  () => props.pending,
  (now, was) => {
    if (!was || now) return;
    if (deleteOpen.value) {
      deleteOpen.value = false;
      cleanupDeleteEvent();
    }
    if (creating.value && props.submitToken === createToken) creating.value = false;
  },
);

const remainingComments = computed(() => remainingCommentCount(props.comments, props.pagination));
const loadMoreComments = () => {
  emit("load-more", props.pagination);
};
</script>
