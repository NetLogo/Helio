<template>
<component :is="tag" :class="['no-stylized-heading', $attrs.class]" v-bind="$attrs">
  <slot mdc-unwrap="p" />
</component>
</template>

<script lang="ts" setup>
type Props = {
  tag?: string;
};

defineProps<Props>();
</script>
