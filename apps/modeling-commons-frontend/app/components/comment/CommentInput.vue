<template>
  <UCard
    :ui="{
      root: cn(focus && 'ring-highlight ring-1'),
      body: 'flex gap-3 px-4 py-2 sm:px-2 sm:py-1 justify-between hover:bg-gray-100 transition-colors duration-200',
    }"
    variant="subtle"
  >
    <UserAvatar
      v-if="!props.isEditing"
      :src="profile?.image"
      :name="profile?.name"
      variant="compact"
      class="self-start my-1 text-xs"
    />
    <UTextarea
      :id="props.id"
      ref="textarea"
      v-model="comment"
      :rows="1"
      :class="{ collapsed: collapsed }"
      :placeholder="placeholder"
      :aria-label="composerLabel"
      :disabled="pending"
      :autofocus="autofocus"
      :ui="{
        base: 'scrollbar-hidden resize-none hover:bg-transparent focus:bg-transparent focus:ring-0 focus:outline-none',
      }"
      autoresize
      variant="ghost"
      @submit="handleSubmit"
      @keydown.enter.exact="handleEnter"
      @focus="focus = true"
      @blur="focus = false"
    >
    </UTextarea>
    <UButton
      variant="ghost"
      size="sm"
      square
      icon="lucide:x"
      color="neutral"
      :disabled="pending"
      class="hidden sm:block self-end rounded-full transition-all duration-200"
      :class="{
        'scale-0': collapsed,
        'scale-100': !collapsed,
      }"
      :inert="collapsed"
      :title="commentLiterals.cancel"
      @click.prevent="emit('cancel')"
    />
    <UButton
      variant="solid"
      size="sm"
      square
      :icon="submitIcon"
      :color="submitColor"
      :loading="pending"
      :disabled="pending"
      class="self-end rounded-full transition-all duration-200"
      :class="{
        'scale-0': collapsed,
        'scale-100': !collapsed,
      }"
      :inert="collapsed"
      :title="commentLiterals.post"
      @click.prevent="handleSubmit"
    />
  </UCard>
</template>

<script lang="ts" setup>
import type { UTextarea } from "#components";
import { isCommentContentValid, normalizeCommentContent } from "@repo/modeling-commons-shared";
import { cn } from "@repo/vue-ui/utils";
import { commentLiterals } from "~/features/comments/literals";

const props = withDefaults(
  defineProps<{
    id?: string;
    target?: string;
    initialText?: string;
    isEditing?: boolean;
    pending?: boolean;
    autofocus?: boolean;
  }>(),
  {
    id: undefined,
    target: undefined,
    initialText: "",
    isEditing: false,
    pending: false,
    autofocus: false,
  },
);

const emit = defineEmits<{
  submit: [value: string];
  cancel: [];
}>();

const { profile } = useProfile();

const comment = ref(props.initialText);
const focus = ref(false);
const collapsed = computed(
  () => !focus.value && !normalizeCommentContent(comment.value) && !props.isEditing,
);
const placeholder = computed(() => {
  switch (true) {
    case Boolean(props.isEditing && props.target):
      return fillTemplate(commentLiterals.placeholderEditReply, { target: props.target ?? "" });
    case Boolean(props.isEditing):
      return commentLiterals.placeholderEdit;
    case Boolean(props.target):
      return fillTemplate(commentLiterals.placeholderReply, { target: props.target ?? "" });
    default:
      return commentLiterals.placeholderNew;
  }
});

const composerLabel = computed(() => {
  if (props.isEditing) return commentLiterals.editComposerLabel;
  if (props.target) return fillTemplate(commentLiterals.replyComposerLabel, { target: props.target });
  return commentLiterals.composerLabel;
});

// Clearing is parent-owned: text must survive a rejected submission, so the
// parent calls clear() only once it accepts the submit.
const handleSubmit = () => {
  if (props.pending || !isCommentContentValid(comment.value)) return;
  emit("submit", comment.value);
};

const IME_PROCESS_KEY_CODE = 229;

const handleEnter = (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === IME_PROCESS_KEY_CODE) return;
  event.preventDefault();
  handleSubmit();
};

const clear = () => {
  comment.value = "";
};

const textarea = useTemplateRef("textarea");
const focusInput = () => {
  textarea.value?.textareaRef?.focus();
};

defineExpose({ clear, focus: focusInput });

const submitIcon = computed(() => (props.isEditing ? "lucide:arrow-right" : "lucide:arrow-up"));
const submitColor = computed(() => (props.isEditing ? "secondary" : "primary"));
</script>
