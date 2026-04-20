<template>
  <UButton
    :data-state="state"
    :ui="ui"
    :icon="icon"
    size="sm"
    square
    v-bind="$attrs"
    aria-label="Copy to clipboard"
    :disabled="!text || state !== 'idle'"
    @click="executeCopyText"
  />
</template>

<script lang="ts" setup>
const props = defineProps<{
  text?: string | null;
}>();
defineOptions({ inheritAttrs: false });

const toast = useToast();
const state = ref<"idle" | "copying" | "success" | "error">("idle");
const icon = computed(() => {
  switch (state.value) {
    case "success":
      return "i-lucide-check";
    case "error":
      return "i-lucide-circle-x";
    default:
      return "i-lucide-copy";
  }
});

const ui = computed(() => {
  switch (state.value) {
    case "success":
      return {
        base: "disabled:opacity-100",
        leadingIcon: "text-green-500",
      };
    case "copying":
      return {
        base: "disabled:opacity-100",
        leadingIcon: "animate-pulse",
      };
    case "error":
      return {
        base: "disabled:opacity-100",
        leadingIcon: "text-red-500",
      };
    default:
      return {};
  }
});

async function executeCopyText() {
  state.value = "copying";
  await nextTick();
  try {
    await copyTextToClipboard(props.text);
    state.value = "success";
  } catch {
    toast.add({
      title: "Failed to copy",
      description: "An error occurred while copying the text. Please try again.",
      color: "error",
      icon: "i-lucide-x-circle",
    });
    state.value = "error";
  } finally {
    setTimeout(() => {
      state.value = "idle";
    }, 2000);
  }
}
</script>
