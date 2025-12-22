<template>
  <Icon :name="name" v-bind="$attrs" />
</template>

<script setup lang="ts">
type Props = {
  name: string;
};
defineProps<Props>();
</script>
