<template>
  <div
    class="flex flex-col items-center justify-center gap-4 w-full px-8 py-16 cursor-pointer border-dashed-stylized border-neutral-lighter transition-colors duration-200 hover:bg-royal-blue-lightest"
    :class="isDragging ? 'bg-royal-blue-lightest border-solid border-royal-blue-light' : ''"
    v-bind="$attrs"
    @dragover.capture.prevent="isDragging = true"
    @dragleave.capture.prevent="isDragging = false"
    @drop.capture.prevent="onDrop"
    @click="openFilePicker"
  >
    <slot :is-dragging="isDragging" />

    <input ref="fileInput" type="file" :accept="accept" class="hidden" @change="onFileSelected" />
  </div>
</template>

<script setup lang="ts">
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

defineProps<{
  accept?: string;
}>();

const emit = defineEmits<{
  select: [file: File];
}>();

function openFilePicker() {
  fileInput.value?.click();
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit("select", file);
  }
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) {
    emit("select", file);
  }
}

defineExpose({
  fileInput,
  openFilePicker,
  isDragging,
});
</script>
