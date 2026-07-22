<template>
  <div class="flex gap-2 -translate-x-5">
    <UButton
      variant="ghost"
      size="xs"
      color="neutral"
      :class="{ 'text-red-600': likedByMe }"
      class="tabular-nums"
      :disabled="pending"
      title="Like"
      @click="$emit('like')"
    >
      <template #leading>
        <span class="relative inline-block size-4">
          <UIcon
            name="fa6-regular:heart"
            class="absolute inset-0 size-full transition-opacity duration-150"
            :class="likedByMe ? 'opacity-0' : 'opacity-100'"
          />
          <UIcon
            name="fa6-solid:heart"
            class="absolute inset-0 size-full transition-opacity duration-150"
            :class="likedByMe ? 'opacity-100' : 'opacity-0'"
          />
        </span>
      </template>
      {{ likes }}
    </UButton>
    <UButton
      variant="ghost"
      size="xs"
      icon="lucide:message-circle"
      color="neutral"
      :disabled="pending"
      title="Reply"
      @click="$emit('reply')"
    >
      <span>Reply <span v-if="replyCount" class="text-xs text-muted align-middle tabular-nums">({{  replyCount }})</span></span>
    </UButton>
    <UDropdownMenu
      v-if="dropdownActions.length > 0"
      :items="dropdownActions"
      :content="{
        align: 'end',
        onCloseAutoFocus: keepFocusForOpenedInput,
      }"
    >
      <UButton
        variant="ghost"
        size="xs"
        icon="lucide:ellipsis-vertical"
        color="neutral"
        :disabled="pending"
        title="More actions"
      />
    </UDropdownMenu>
  </div>
</template>

<script lang="ts" setup>
import type { DropdownMenuItem } from "#ui/types";
const props = defineProps<{
  likes?: number;
  replyCount?: number;
  likedByMe?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  pending?: boolean;
}>();

const emits = defineEmits<{
  like: [];
  reply: [];
  edit: [];
  delete: [];
}>();

// Selecting "Edit" opens an autofocusing input. Reka returns focus to the menu
// trigger when it closes, which would immediately blur that input — so for the
// edit path we prevent the menu's close-auto-focus and let the input keep focus.
// Escape / click-away / Delete still restore focus to the trigger normally.
const openingInput = ref(false);
const keepFocusForOpenedInput = (event: Event) => {
  if (!openingInput.value) return;
  openingInput.value = false;
  event.preventDefault();
};

const dropdownActions = computed<Array<DropdownMenuItem>>(() => {
  const actions: DropdownMenuItem[] = [];

  if (props.canEdit) {
    actions.push({
      label: "Edit",
      icon: "lucide:square-pen",
      onSelect: () => {
        openingInput.value = true;
        emits("edit");
      },
    });
  }
  if (props.canDelete) {
    actions.push({
      label: "Delete",
      icon: "lucide:trash-2",
      onSelect: () => emits("delete"),
      color: "error",
    });
  }
  return actions;
});
</script>
