<template>
  <code class="netlogo-command" :data-primitive-name="name">
    <Anchor
      :href="url"
      class="netlogo-wiki-link"
      :data-display-text="name"
      :target="external ? '_blank' : '_self'"
      :rel="external ? 'noopener noreferrer' : null"
      :external="false"
      v-bind="$attrs"
      >{{ name }}</Anchor
    >
  </code>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string;
  url?: string;
}>();

const external = computed(() => {
  return props.url?.startsWith("http");
});
</script>
