<template>
  <div class="flex flex-col gap-3">
    <ConfirmDeleteCommentDialog
      v-model:open="deleteOpen"
      :deleting="deleting"
      @confirm="handleDelete"
      @cancel="cleanupDeleteEvent"
    />
    <CommentInput v-if="!isReadOnly" ref="composer" class="mb-5" @submit="handleCreate" @cancel="handleCancel" />
    <CommentView
      v-for="comment in comments"
      :key="comment.id"
      :comment="comment"
      :maximum-nested="maximumNested"
      :maximum-shown-replies-per-level="maximumShownRepliesPerLevel"
      :is-nested="isNested"
      :parent-has-see-more-replies="parentHasSeeMoreReplies"
      :read-only="isReadOnly"
      @reply="emit('reply', $event)"
      @edit="emit('edit', $event)"
      @like="emit('like', $event)"
      @unlike="emit('unlike', $event)"
      @load="emit('load', $event)"
      @delete="confirmDelete"
      @write="handleWriteAttempt"
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
}>();

const toast = useToast();
const user = useUser();

const isReadOnly = computed(() => props.readOnly || !user.value.isLoggedIn);

const composer = ref<{ clear: () => void } | null>(null);
const handleCreate = (content: string) => {
  emit("create", { content });
  composer.value?.clear();
};
const handleCancel = () => {
  composer.value?.clear();
};

const deleteOpen = ref(false);
const deleting = ref(false);
const deleteTarget = ref<string | null>(null);
const handleDelete = () => {
  deleting.value = true;

  try {
    if (deleteTarget.value) {
      emit("delete", { commentId: deleteTarget.value });
    }

    toast.add({
      title: "Comment deleted",
      description: "The comment has been successfully deleted.",
      color: "success",
      icon: "lucide:message-circle",
    });
  } finally {
    deleteOpen.value = false;
    deleting.value = false;
    cleanupDeleteEvent();
  }
};
const confirmDelete = (event: { commentId: string }) => {
  deleteTarget.value = event.commentId;
  deleteOpen.value = true;
};
const cleanupDeleteEvent = () => {
  deleteTarget.value = null;
};

const handleWriteAttempt = () => {
  if (!user.value.isLoggedIn) {
    showRequiresLoginToast("participate in discussions");
  }
};

const remainingComments = computed(() => remainingCommentCount(props.comments, props.pagination));
const loadMoreComments = () => {
  emit("load-more", props.pagination);
};
</script>
