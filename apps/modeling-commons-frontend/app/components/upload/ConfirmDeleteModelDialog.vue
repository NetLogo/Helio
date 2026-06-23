<template>
  <UModal v-model:open="open" title="Delete Model" class="lg:max-w-xl">
    <template #content>
      <div class="space-y-8 p-8">
        <h6 class="text-center">Are you sure you want to delete this model?</h6>
        <p class="text-center">
          This action cannot be undone. If this is the only copy of the model, the model file and
          all its versions will be permanently deleted.
        </p>
        <div class="flex justify-end gap-2 w-full mt-4">
          <UButton variant="outline" color="neutral" size="sm" @click="open = false">
            Cancel
          </UButton>
          <UButton
            variant="solid"
            color="error"
            icon="i-lucide-trash-2"
            size="sm"
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
