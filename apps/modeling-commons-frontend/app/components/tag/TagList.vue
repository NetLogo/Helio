<template>
  <div class="flex flex-wrap gap-2.5">
    <TagChip
      v-for="tag in shownTags"
      :id="tag.id"
      :key="tag.id ?? tag.name"
      :name="tag.name"
      :display-name="tag.displayName"
    />
    <TagChip
      v-if="extraTagCount > 0 && props.showExtraTagCount"
      :name="`+${extraTagCount} more`"
      :linkable="false"
      class="bg-muted text-muted-foreground"
    />
    <AddTagButton v-if="editable" @add="$emit('add')" />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    tags: Array<{ id?: string; name: string; displayName?: string }>;
    editable?: boolean;
    maxShownTags?: number;
    showExtraTagCount?: boolean;
  }>(),
  {
    editable: false,
    maxShownTags: 5,
    showExtraTagCount: true,
  },
);

const shownTags = computed(() => props.tags.slice(0, props.maxShownTags));
const extraTagCount = computed(() => props.tags.length - shownTags.value.length);

defineEmits<{
  add: [];
}>();
</script>
