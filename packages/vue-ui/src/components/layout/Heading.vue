<template>
  <component :is="as" v-bind="$attrs" :id="id">
    <a :href>
      <slot />
    </a>
  </component>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

type Props = {
  id: string
  as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}
const props = defineProps<Props>()
const href = computed(() => `#${props.id}`)
</script>
