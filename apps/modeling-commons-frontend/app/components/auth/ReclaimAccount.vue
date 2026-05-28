<template>
  <UAlert
    variant="subtle"
    icon="i-lucide-alert-triangle"
    color="warning"
    title="Do you have an old account?"
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

const resetPasswordLink = computed(() => {
  const nextPath = getSafeNextPath(props.next);
  return `${authRoutes.resetPassword}?next=${encodeURIComponent(nextPath)}`;
});
</script>
