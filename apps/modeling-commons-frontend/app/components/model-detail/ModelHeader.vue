<template>
  <header class="space-y-6">
    <div class="flex items-start justify-between gap-4 mb-1">
      <h5 class="text-highlighted m-0">
        {{ title }}
      </h5>
      <div class="flex items-center gap-3 shrink-0">
        <UButton icon="i-lucide-code" size="sm" @click="$emit('embed')"> Embed </UButton>
        <UButton v-if="downloadUrl" icon="i-lucide-download" :to="downloadUrl" external size="sm">
          Download
        </UButton>
      </div>
    </div>

    <div class="flex items-center gap-2 text-sm text-muted flex-wrap">
      <div v-if="authors.length > 0" class="flex items-center gap-2">
        <UAvatarGroup :max="3">
          <UAvatar
            v-for="(author, index) in authors"
            :key="index"
            :name="author.name"
            :src="author.image"
            size="sm"
            :alt="author.name"
          />
        </UAvatarGroup>
        <NuxtLink class="font-medium text-royal-blue">
          {{ primaryAuthor?.name }}
        </NuxtLink>
        <UTooltip>
          <span v-if="authors.length > 1"
            >and {{ authors.length - 1 }}
            {{ pluralize(authors.length - 1, "other", "others") }}</span
          >
          <template #content>
            <div class="space-y-1">
              <NuxtLink
                v-for="(author, index) in authors"
                :key="index"
                class="flex items-center gap-2"
              >
                <UAvatar :name="author.name" :src="author.image" size="xs" :alt="author.name" />
                <span>{{ author.name }}</span>
              </NuxtLink>
            </div>
          </template>
        </UTooltip>
      </div>
      <Middot v-if="primaryAuthor" />
      <span>{{ relativeDate }}</span>
      <template v-if="netlogoVersion">
        <Middot v-if="primaryAuthor" />
        <span>Written in {{ netlogoVersion }}</span>
      </template>
      <template v-if="modelGroup">
        <Middot v-if="primaryAuthor" />
        <span>
          Model Group:
          <NuxtLink class="font-medium text-primary-700 hover:underline">{{ modelGroup }}</NuxtLink>
        </span>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { formatRelativeDate } from "~/utils/formatters";

type Author = {
  name: string;
  image?: string;
};
const props = defineProps<{
  title: string;
  authors: Array<Author>;
  primaryAuthor?: Author;
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
