<template>
  <header class="space-y-4">
    <div class="flex items-start justify-between gap-4">
      <h1 class="text-3xl font-bold text-highlighted tracking-tight m-0">
        {{ title }}
      </h1>
      <div class="flex items-center gap-2 shrink-0">
        <UButton variant="outline" color="secondary" class="px-5 py-2 ring-secondary/20" icon="i-lucide-code" @click="$emit('embed')"> Embed </UButton>
        <UButton
          v-if="downloadUrl"
          variant="outline"
          icon="i-lucide-download"
          :to="downloadUrl"
          class="px-5 py-2 ring-secondary/20"
          color="secondary"
          external
        >
          Download
        </UButton>
      </div>
    </div>

    <div class="flex items-center gap-2 text-sm text-muted flex-wrap">
      <div v-if="author" class="flex items-center gap-2">
        <UAvatar :name="author.name" :src="author.image" size="xs" :alt="author.name" />
        <NuxtLink class="font-medium text-primary-700 hover:underline">
          {{ author.name }}
        </NuxtLink>
      </div>
      <span v-if="author" class="text-dimmed leading-0 text-2xl">&middot;</span>
      <span>{{ relativeDate }}</span>
      <template v-if="netlogoVersion">
        <span v-if="author" class="text-dimmed leading-0 text-2xl">&middot;</span>
        <span>Written in {{ netlogoVersion }}</span>
      </template>
      <template v-if="modelGroup">
        <span v-if="author" class="text-dimmed leading-0 text-2xl">&middot;</span>
        <span>
          Model Group:
          <NuxtLink class="font-medium text-primary-700 hover:underline">{{ modelGroup }}</NuxtLink>
        </span>
      </template>
    </div>

    <hr class="border-default" />
  </header>
</template>

<script setup lang="ts">
import { formatRelativeDate } from "~/utils/formatters";

const props = defineProps<{
  title: string;
  author?: { name: string; image?: string };
  createdAt: string;
  netlogoVersion?: string | null;
  modelGroup?: string | null;
  downloadUrl?: string | null;
}>();

defineEmits<{
  embed: [];
}>();

const relativeDate = computed(() => formatRelativeDate(props.createdAt));
</script>
