<template>
  <DropdownMenu>
    <DropdownMenuTrigger class="line-clamp-1 ellipsis" :class="focusVisibleRingClass">
      {{ selectedVersionDisplay }}
      <Icon name="i-lucide:chevron-down" class="align-middle" />
    </DropdownMenuTrigger>

    <DropdownMenuContent>
      <DropdownMenuItem
        v-for="(value, key) in processedVersions"
        :key="key"
        :variant="value.selected ? 'selected' : 'default'"
        :disabled="value.disabled"
        class="not-last:mb-1"
        :class="[focusVisibleRingClass, 'focus-visible:bg-primary']"
        @click="emit('versionChange', key)"
      >
        {{ value.displayName }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/dropdown-menu'
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

export type { VersionSelectDropdownProps, VersionProps }
</script>
