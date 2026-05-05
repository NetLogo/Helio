<template>
  <div class="flex flex-col items-start gap-4">
    <label class="text-md font-medium">Profile Picture</label>
    <div class="relative">
      <button
        type="button"
        class="group relative block size-40 overflow-hidden rounded-full ring-1 ring-neutral-darkest/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :class="{
          'cursor-pointer': !pending,
          'cursor-not-allowed': pending,
        }"
        :disabled="pending"
        :aria-label="alt ? `Change avatar for ${alt}` : 'Change avatar'"
        @click="openFilePicker"
      >
        <UserAvatar
          :src="imageSrc"
          :alt="alt"
          :text="initials"
          :pending="pending"
          class="size-full rounded-full bg-neutral-darkest/5 text-2xl"
          variant="compact"
        />

        <span
          v-if="pending"
          class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-white"
        >
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        </span>
      </button>

      <div class="flex flex-wrap gap-2 absolute left-0 bottom-0 ml-2 mb-2">
        <UDropdownMenu :items="menuItems" :content="{ align: 'start' }">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-pencil"
            :loading="pending"
            :disabled="pending"
            size="xs"
            block
          >
            Edit
          </UButton>
        </UDropdownMenu>
      </div>
    </div>
    <div class="grid gap-3 sm">
      <p class="m-0 text-sm text-muted">
        Upload a square image. PNG, JPG, or GIF. Max {{ maxSizeLabel }}.
      </p>
    </div>

    <span v-if="error" class="text-sm text-error">{{ error }}</span>

    <input ref="fileInput" type="file" :accept="accept" class="hidden" @change="onFileChange" />
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    pending?: boolean;
    canRemove?: boolean;
    accept?: string;
    maxSizeLabel?: string;
    optimistic?: boolean;
    error?: string;
  }>(),
  {
    src: undefined,
    alt: "",
    pending: false,
    canRemove: false,
    accept: "image/png,image/jpeg,image/gif,image/webp",
    maxSizeLabel: "2 MB",
    optimistic: true,
    error: undefined,
  },
);

const emit = defineEmits<{
  select: [file: File];
  remove: [];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const file = ref<File | null>(null);
const imageSrc = computed(() => {
  if (props.optimistic && !props.error && file.value) {
    return URL.createObjectURL(file.value);
  }
  return props.src;
});

const initials = computed(() => {
  if (!props.alt) return "";
  return props.alt
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
});

const menuItems = computed<Array<Array<DropdownMenuItem>>>(() => {
  const upload: DropdownMenuItem = {
    label: "Upload a photo…",
    icon: "i-lucide-upload",
    onSelect: openFilePicker,
  };

  if (!props.canRemove) {
    return [[upload]];
  }

  return [
    [upload],
    [
      {
        label: "Remove photo",
        icon: "i-lucide-trash-2",
        color: "error",
        onSelect: () => emit("remove"),
      },
    ],
  ];
});

function openFilePicker() {
  if (props.pending) return;
  fileInput.value?.click();
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const selectedFile = target.files?.[0] ?? null;
  file.value = selectedFile;
  if (selectedFile) {
    emit("select", selectedFile);
  }
  target.value = "";
}
</script>
