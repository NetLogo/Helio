<template>
  <UModal v-model:open="open" class="lg:max-w-2xl">
    <template #content>
      <div class="space-y-8 p-8">
        <h6 class="text-center">
          You have unsaved changes. Are you sure you want to {{ isEdit ? "discard your edits" : "discard this draft" }}?
        </h6>
        <div class="flex justify-end gap-2 w-full mt-4">
          <UButton variant="outline" color="neutral" size="sm" @click="open = false">
            Cancel
          </UButton>
          <UButton
            variant="solid"
            color="error"
            size="sm"
            :loading="publishing"
            :disabled="publishing"
            @click="emit('confirm')"
          >
            {{ isEdit ? "Discard edits" : "Discard draft" }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
defineProps<{ isEdit: boolean; publishing: boolean }>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{ confirm: [] }>();
</script>
