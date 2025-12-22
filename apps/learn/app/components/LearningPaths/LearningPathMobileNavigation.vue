<template>
  <CollapsibleHeader :label="label">
    <UContentNavigation
      :navigation="navigation"
      :collapsible="false"
      class="bg-white rounded-md py-5 px-2 shadow-xl z-10 max-h-[70vh] overflow-auto"
    />
  </CollapsibleHeader>
</template>

<script setup lang="ts">
type Props = {
  navigation: LearningPathNavigation;
  myself: LearningPathSelf | { lp: LearningPathData };
};

const props = defineProps<Props>();
const label = computed(() => {
  return 'title' in props.myself ? `${props.myself.lp.title}: ${props.myself.title}` : props.myself.lp.title;
});
</script>
