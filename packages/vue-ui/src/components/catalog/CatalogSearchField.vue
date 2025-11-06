<template>
  <Input
    :class="cn($style['search-bar'])"
    type="text"
    :placeholder="placeholder"
    :model-value="modelValue"
    aria-label="Catalog Search Field"
    aria-describedby="Type to search catalog items"
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'

import type { SearchFieldProps } from './types'

import Input from '../Input.vue'

type Props = SearchFieldProps & {}

withDefaults(defineProps<Props>(), {
  placeholder: 'Search...',
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style module src="./Catalog.module.scss"></style>
