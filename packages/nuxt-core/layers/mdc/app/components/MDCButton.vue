<script setup lang="ts">
import { Button } from '@repo/vue-ui';
</script>

<template>
  <Button v-bind="$attrs" class="[&_p]:p-0 [&_p]:m-0 w-fit">
    <slot mdc-unwrap="p" />
  </Button>
</template>
