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
        data-testid="draft-primary-action"
        @click="onPrimaryAction"
      >
        {{ submitLabel }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    isEdit: boolean;
    publishing: boolean;
    hydrating?: boolean;
    deletingModel: boolean;
    draftId: string | null | undefined;
    saveStatusLabel: string;
    submitLabel: string;
    discardLabel: string;
    isLastStep?: boolean;
  }>(),
  { hydrating: false, isLastStep: true },
);

const emit = defineEmits<{
  delete: [];
  discard: [];
  next: [];
  submit: [];
}>();

function onPrimaryAction(): void {
  if (props.isLastStep) {
    emit("submit");
    return;
  }
  emit("next");
}
</script>
