<template>
  <UUser
    :name="name"
    :description="description"
    size="3xl"
    :avatar="{
      src: 'https://i.pravatar.cc/150?u=john-doe',
    }"
    :ui="{
      root: 'hover:cursor-pointer w-fit',
      name: 'text-md group-hover/user:underline',
      description: 'text-sm text-muted',
    }"
  >
    <template #avatar="{ ui }">
      <div
        class="inline-flex items-center justify-center select-none rounded-full align-middle bg-royal-blue-lighter size-12 text-2xl"
        :class="ui.avatar($props)"
      >
        <UIcon name="i-lucide-hash" />
      </div>
    </template>
  </UUser>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  description: string;
}>();
</script>
