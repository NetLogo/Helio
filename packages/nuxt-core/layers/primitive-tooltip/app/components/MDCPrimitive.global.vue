<template>
  <PrimTooltip :name="displayText ?? permalink">
    <slot />
  </PrimTooltip>
</template>

<script setup lang="ts">
type Props = {
  permalink: string;
  displayText?: string;
};

withDefaults(defineProps<Props>(), {
  displayText: undefined,
});
</script>
