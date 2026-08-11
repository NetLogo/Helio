<template>
  <UAlert
    variant="subtle"
    icon="i-lucide-alert-triangle"
    color="warning"
    title="Got an old account?"
    class="text-left"
    :actions="[
      {
        color: 'neutral',
        label: 'Reclaim Account',
        to: resetPasswordLink,
      },
    ]"
    :orientation="'horizontal'"
    :closable="false"
  />
</template>

<script lang="ts" setup>
const props = defineProps<{
  next?: string;
}>();

const resetPasswordLink = computed(() => getResetPasswordLink(props.next));
</script>
