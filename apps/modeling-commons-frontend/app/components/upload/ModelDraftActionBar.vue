<template>
  <div class="flex gap-4 items-center justify-between w-full flex-wrap">
    <span class="text-sm text-muted" aria-live="polite">
      {{ saveStatusLabel }}
    </span>
    <div class="flex items-center gap-3 flex-wrap">
      <UButton
        v-if="isEdit"
        variant="subtle"
        color="error"
        icon="i-lucide-trash-2"
        :disabled="publishing || deletingModel"
        @click="emit('delete')"
      >
        Delete
      </UButton>
      <UButton
        v-if="isEdit"
        variant="outline"
        color="neutral"
        :disabled="publishing || reverting || !isDirty"
        :loading="reverting"
        @click="emit('revert')"
      >
        Revert
      </UButton>
      <UButton
        variant="outline"
        color="neutral"
        :disabled="publishing || !draftId"
        @click="emit('discard')"
      >
        {{ discardLabel }}
      </UButton>
      <UButton
        :loading="publishing"
        :disabled="publishing || hydrating"
        variant="solid"
        color="primary"
        @click="emit('submit')"
      >
        {{ submitLabel }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    isEdit: boolean;
    publishing: boolean;
    hydrating?: boolean;
    reverting: boolean;
    deletingModel: boolean;
    isDirty: boolean;
    draftId: string | null | undefined;
    saveStatusLabel: string;
    submitLabel: string;
    discardLabel: string;
  }>(),
  { hydrating: false },
);

const emit = defineEmits<{
  delete: [];
  revert: [];
  discard: [];
  submit: [];
}>();
</script>
