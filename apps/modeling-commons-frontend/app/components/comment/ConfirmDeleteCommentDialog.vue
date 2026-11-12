<template>
  <UModal v-model:open="open" :title="commentLiterals.deleteDialogTitle" class="lg:max-w-lg">
    <template #content>
      <div class="p-6 space-y-5">
        <div class="flex gap-4">
          <div class="shrink-0 flex items-center justify-center size-10 rounded-full bg-error/10">
            <UIcon name="i-lucide-trash-2" class="size-5 text-error" />
          </div>
          <div class="space-y-1">
            <h6 class="font-semibold text-highlighted">{{ commentLiterals.deleteDialogHeading }}</h6>
            <p class="text-sm text-muted">
              {{ commentLiterals.deleteDialogBody }}
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="handleCancel">{{ commentLiterals.cancel }}</UButton>
          <UButton
            color="error"
            icon="i-lucide-trash-2"
            :loading="deleting"
            :disabled="deleting"
            @click="handleConfirm"
          >
            {{ commentLiterals.deleteDialogConfirm }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { commentLiterals } from "~/features/comments/literals";
defineProps<{ deleting: boolean }>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ confirm: [], cancel: [] }>();

const confirming = ref(false);

const handleConfirm = () => {
  confirming.value = true;
  emit("confirm");
};

const handleCancel = () => {
  open.value = false;
};

// Every close that is not confirm-driven (Cancel button, ESC, overlay click)
// must behave as a cancel so the parent can clean up its pending target.
watch(open, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen && !confirming.value) {
    emit("cancel");
  }
  confirming.value = false;
});
</script>