<template>
  <div class="container text-start ps-3">
    <p class="pt-1">
      Don't know what {{ platformMachine }} you're using? Figure it out
      <a
        :href="machineLink"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary underline"
        >here</a
      >.
    </p>
    <p class="pt-3">
      NetLogo also works for
      <NuxtLink :to="`/downloads/${otherPlatform1.toLowerCase()}`" class="text-primary">{{
        otherPlatform1
      }}</NuxtLink>
      and
      <NuxtLink :to="`/downloads/${otherPlatform2.toLowerCase()}`" class="text-primary">{{
        otherPlatform2
      }}</NuxtLink
      >.
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  platformMachine: string;
  machineLink: string;
  otherPlatform1: string;
  otherPlatform2: string;
}>();
</script>
