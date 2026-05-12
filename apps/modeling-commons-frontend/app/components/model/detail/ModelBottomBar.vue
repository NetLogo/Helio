<template>
  <section class="flex items-center justify-between flex-wrap gap-4">
    <ModelStats :likes="likes" :downloads="downloads" :views="views" :runs="runs" />

    <div class="flex items-center gap-3">
      <ModelLike :active="likedByMe" :busy="busy" @toggle="$emit('toggleLike')" />
      <UButton variant="outline" size="sm" icon="i-lucide-share-2" square @click="$emit('share')" />
      <UButton variant="outline" size="sm" icon="i-lucide-copy" square @click="$emit('compare')" />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  likes: number;
  downloads: number;
  views: number;
  runs: number;
  likedByMe: boolean;
  busy?: boolean;
}>();

defineEmits<{
  toggleLike: [];
  share: [];
  compare: [];
}>();
</script>
