<template>
  <UButton
    variant="link"
    size="xs"
    color="neutral"
    class="pt-2 pb-4 ml-2 underline"
    @click="$emit('see-more-replies')"
  >
    {{ seeMoreRepliesCopy }}
  </UButton>
</template>

<script lang="ts" setup>
import { commentLiterals } from "~/features/comments/literals";

const props = defineProps<{
  replyCount: number;
}>();

defineEmits<{
  "see-more-replies": [];
}>();

const seeMoreRepliesCopy = computed(() => {
  return props.replyCount === 1
    ? commentLiterals.seeOneMoreReply
    : fillTemplate(commentLiterals.seeMoreReplies, { count: props.replyCount });
});
</script>
