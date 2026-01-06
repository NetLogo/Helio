<template>
  <UDropdownMenu
    :items
    :external-icon="true"
    :ui="{
      content: 'w-fit max-h-[70vh]',
      item: 'rounded-md hover:not-[disabled]:bg-neutral-200 focus:bg-neutral-200/90',
    }"
    :loop="true"
  >
    <UButton :class="focusVisibleRingClass" trailing-icon="i-lucide:chevron-down" variant="outline">
      {{ selectedVersionDisplay }}
    </UButton>

    <template #selected-trailing>
      <Icon name="i-lucide-badge-check" class="shrink-0 size-5 text-primary" />
    </template>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

import { ObjectFunctor } from '@repo/utils/std/objects'
import { computed } from 'vue'

type VersionProps = {
  disabled?: boolean // Default: false
  displayName?: string // Default: version name
}

type VersionSelectDropdownProps = {
  selectedVersion?: string
  versions?: Record<string, VersionProps>
}

const props = withDefaults(defineProps<VersionSelectDropdownProps>(), {
  selectedVersion: '',
  versions: () => ({}),
})

const emit = defineEmits<{
  versionChange: [version: string]
}>()

const focusVisibleRingClass = 'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring'
const processedVersions = computed(() => {
  return new ObjectFunctor(props.versions)
    .mapValues((key, value) => {
      return {
        disabled: value.disabled,
        displayName: value.displayName ?? key,
        selected: props.selectedVersion === key,
      }
    })
    .get()
})

const selectedVersionDisplay = computed(() => {
  const selected = processedVersions.value[props.selectedVersion]
  return selected?.displayName ?? props.selectedVersion
})

const items = computed<Array<DropdownMenuItem>>(() =>
  Object.entries(processedVersions.value).map(([key, value]) => ({
    label: value.displayName,
    value: key,
    disabled: value.disabled,
    slot: value.selected ? 'selected' : 'not-selected',
    onSelect: (): void => emit('versionChange', key),
  }))
)

export type { VersionProps, VersionSelectDropdownProps }
</script>
