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
const props = defineProps<{
  replyCount: number;
}>();

defineEmits<{
  "see-more-replies": [];
}>();

const seeMoreRepliesCopy = computed(() => {
  return props.replyCount === 1 ? "See 1 more reply" : `See ${props.replyCount} more replies`;
});
</script>
