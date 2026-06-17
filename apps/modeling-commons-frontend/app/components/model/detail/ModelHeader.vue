<template>
  <header class="space-y-6">
    <div class="flex justify-between items-center gap-4 mb-1">
      <div class="flex gap-2 items-start">
        <h5 class="text-highlighted m-0">
          {{ title }}
        </h5>
        <UBadge
          v-if="visibility && visibility.label !== 'public'"
          :icon="visibility.icon"
          :title="visibility.label"
          variant="solid"
          size="md"
          square
          class="shrink-0"
        />
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <UButton data-show-from="lg" icon="i-lucide-code" size="sm" @click="$emit('embed')">
          Embed
        </UButton>

        <UButton
          v-if="downloadUrl"
          data-show-from="lg"
          icon="i-lucide-download"
          :to="downloadUrl"
          external
          size="sm"
          @click="$emit('download')"
        >
          Download
        </UButton>
        <UDropdownMenu :content="{ align: 'end' }" :items="modelActionsDropdownItems">
          <UButton icon="i-lucide-ellipsis-vertical" square size="sm" />
        </UDropdownMenu>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row lg:items-center gap-2 text-sm text-muted flex-wrap">
      <ModelAuthors v-if="authors.length > 0" :authors="authors" />
      <Middot v-if="authors.length > 0" data-show-from="lg" />
      <div class="flex gap-2">
        <span>{{ relativeDate }}</span>
        <template v-if="netlogoVersion">
          <Middot v-if="authors.length > 0" />
          <span>Authored in {{ netlogoVersion }}</span>
        </template>
        <template v-if="modelGroup">
          <Middot v-if="authors.length > 0" />
          <span>
            Model Group:
            <NuxtLink class="font-medium text-primary-700 hover:underline">{{
              modelGroup
            }}</NuxtLink>
          </span>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "#ui/types";
import { modelActions } from "~/forms/model-detail";
import { formatRelativeDate } from "~/utils/formatters";
import type { Author } from "../ModelAuthors.vue";

const props = defineProps<{
  title: string;
  authors: Array<Author>;
  createdAt: string;
  netlogoVersion?: string | null;
  modelGroup?: string | null;
  downloadUrl?: string | null;
  modelVisibility?: string;
  previewImageUrl?: string | null;
  permissions: UserModelPermissions;
}>();

const emit = defineEmits<{
  embed: [];
  download: [];
  fork: [];
  edit: [];
}>();

const relativeDate = computed(() => formatRelativeDate(props.createdAt));
const visibility = getModelVisibilityDisplayInfo(props.modelVisibility || "");

const modelActionsDropdownItems = ref([
  { type: "label", label: "Actions" },
  {
    ...modelActions.edit,
    onClick: () => emit(modelActions.edit.action),
    class: !props.permissions.canEdit ? 'hidden' : '',
  },
  {
    ...modelActions.embed,
    onClick: () => emit(modelActions.embed.action),
    class: "flex md:hidden",
  },
  {
    ...modelActions.download,
    onClick: () => emit(modelActions.download.action),
    class: "flex md:hidden",
    disabled: !props.downloadUrl,
  },
  {
    ...modelActions.fork,
    onClick: () => emit(modelActions.fork.action),
    class: !props.permissions.canFork ? 'hidden' : '',
  },
] satisfies Array<DropdownMenuItem>);
</script>
