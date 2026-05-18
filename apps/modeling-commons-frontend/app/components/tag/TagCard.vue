<template>
  <NuxtLink :to="href" class="group/user block w-fit">
    <UUser
      :name="label"
      :description="description"
      size="3xl"
      :avatar="{
        src: 'https://i.pravatar.cc/150?u=john-doe',
      }"
      :ui="{
        root: 'hover:cursor-pointer w-fit',
        name: 'text-md group-hover/user:text-royal-blue font-medium',
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
  </NuxtLink>
</template>

<script setup lang="ts">
import { createTagPath } from "~/utils/formatters";

const props = defineProps<{
  name: string;
  displayName?: string;
  description: string;
}>();

const label = computed(() =>
  props.displayName && props.displayName.length > 0 ? props.displayName : sentenceCase(props.name),
);
const href = computed(() => (props.name ? createTagPath(props.name) : undefined));
</script>
