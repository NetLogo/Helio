<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 translate-y-2"
  >
    <UButton
      v-if="show"
      icon="i-lucide-arrow-up"
      color="primary"
      size="lg"
      :ui="{ base: 'rounded-full shadow-lg' }"
      class="fixed bottom-6 right-6 z-50"
      aria-label="Back to top"
      @click="emit('click')"
    />
  </Transition>
</template>

<script setup lang="ts">
defineProps<{ show: boolean }>();

const emit = defineEmits<{ click: [] }>();
</script>
