<template>
  <div class="flex flex-col gap-0.5">
    <h5 class="font-heading font-medium leading-(--line-height-subheading) tracking-[-0.28px]">
      {{ title }}
    </h5>
    <p class="text-sm text-neutral-darkest-60">
      Required fields are marked with an asterisk (<span class="text-coral">*</span>)
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>
