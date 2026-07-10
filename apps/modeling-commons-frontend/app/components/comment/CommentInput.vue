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
      :alt="profile?.name"
      variant="compact"
      class="self-start my-1"
    />
    <UTextarea
      :id="props.id"
      v-model="comment"
      :rows="1"
      :class="{ collapsed: collapsed }"
      :placeholder="placeholder"
      :ui="{
        base: 'scrollbar-hidden resize-none hover:bg-transparent focus:bg-transparent focus:ring-0 focus:outline-none',
      }"
      autoresize
      variant="ghost"
      @submit="handleSubmit"
      @keydown.enter.exact.prevent="handleSubmit"
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
      class="self-end rounded-full transition-all duration-200"
      :class="{
        'scale-0': collapsed,
        'scale-100': !collapsed,
      }"
      title="Cancel"
      @click.prevent="emit('cancel')"
    />
    <UButton
      variant="solid"
      size="sm"
      square
      :icon="submitIcon"
      :color="submitColor"
      class="self-end rounded-full transition-all duration-200"
      :class="{
        'scale-0': collapsed,
        'scale-100': !collapsed,
      }"
      title="Post"
      @click.prevent="handleSubmit"
    />
  </UCard>
</template>

<script lang="ts" setup>
import type { UTextarea } from "#components";
import { cn } from "@repo/vue-ui/utils";

const props = withDefaults(
  defineProps<{
    id?: string;
    target?: string;
    initialText?: string;
    isEditing?: boolean;
  }>(),
  {
    id: undefined,
    target: undefined,
    initialText: "",
    isEditing: false,
  },
);

const emit = defineEmits<{
  submit: [value: string];
  cancel: [];
}>();

const { profile } = useProfile();

const comment = ref(props.initialText);
const focus = ref(false);
const collapsed = computed(() => !focus.value && !comment.value.trim().length && !props.isEditing);
const placeholder = computed(() => {
  switch (true) {
    case Boolean(props.isEditing && props.target):
      return `Edit your reply to ${props.target}...`;
    case Boolean(props.isEditing):
      return "Edit your comment...";
    case Boolean(props.target):
      return `Reply to ${props.target}...`;
    default:
      return "Leave a comment...";
  }
});

// Clearing is parent-owned: text must survive a rejected submission, so the
// parent calls clear() only once it accepts the submit.
const handleSubmit = () => {
  if (!comment.value.trim()) return;
  emit("submit", comment.value);
};

const clear = () => {
  comment.value = "";
};

defineExpose({ clear });

const submitIcon = computed(() => (props.isEditing ? "lucide:arrow-right" : "lucide:arrow-up"));
const submitColor = computed(() => (props.isEditing ? "secondary" : "primary"));
</script>
