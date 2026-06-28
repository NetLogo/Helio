<template>
  <UModal v-model:open="open" title="Delete Model" class="lg:max-w-lg">
    <template #content>
      <div class="p-6 space-y-5">
        <div class="flex gap-4">
          <div class="shrink-0 flex items-center justify-center size-10 rounded-full bg-error/10">
            <UIcon name="i-lucide-trash-2" class="size-5 text-error" />
          </div>
          <div class="space-y-1">
            <h6 class="font-semibold text-highlighted">Delete this model?</h6>
            <p class="text-sm text-muted">
              This action cannot be undone. If this is the only copy, the model file and all its
              versions will be permanently deleted.
            </p>
          </div>
        </div>

        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-alert-triangle"
          title="Unpublished drafts will be lost"
          description="Any unpublished draft(s) of this model will also be permanently deleted and cannot be recovered."
          :ui="{ description: 'text-sm' }"
        />

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="open = false">Cancel</UButton>
          <UButton
            color="error"
            icon="i-lucide-trash-2"
            :loading="deleting"
            :disabled="deleting"
            @click="emit('confirm')"
          >
            Delete model
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
defineProps<{ deleting: boolean }>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ confirm: [] }>();
</script>