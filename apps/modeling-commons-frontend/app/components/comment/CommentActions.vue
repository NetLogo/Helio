<template>
  <div class="flex gap-2 -translate-x-5">
    <UButton
      variant="ghost"
      size="xs"
      color="neutral"
      :icon="likedByMe ? 'fa6-solid:heart' : 'fa6-regular:heart'"
      :class="{ 'text-red-600': likedByMe }"
      title="Like"
      @click="$emit('like')"
    >
      {{ likes }}
    </UButton>
    <UButton
      variant="ghost"
      size="xs"
      icon="lucide:message-circle"
      color="neutral"
      title="Reply"
      @click="$emit('reply')"
    >
      <span>Reply <span v-if="replyCount" class="text-xs text-muted align-middle">({{  replyCount }})</span></span>
    </UButton>
    <UDropdownMenu
      v-if="dropdownActions.length > 0"
      :items="dropdownActions"
      :content="{
        align: 'end',
      }"
    >
      <UButton
        variant="ghost"
        size="xs"
        icon="lucide:ellipsis-vertical"
        color="neutral"
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
}>();

const emits = defineEmits<{
  like: [];
  reply: [];
  edit: [];
  delete: [];
}>();

const dropdownActions = computed<Array<DropdownMenuItem>>(() => {
  const actions: DropdownMenuItem[] = [];

  if (props.canEdit) {
    actions.push({ label: "Edit", icon: "lucide:square-pen", onSelect: () => emits("edit") });
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
