<template>
  <input :id="id + '-toggle'" ref="toggleRef" type="checkbox" :class="cn($style['menuToggle'])" v-bind="$attrs" />
</template>

<script setup lang="ts">
import { cn } from '@repo/vue-ui/utils'
import { ref } from 'vue'

const toggleRef = ref<HTMLInputElement | null>(null)

type Props = {
  id: string
}

function blur(): void {
  if (toggleRef.value) {
    toggleRef.value.checked = false
  }
}

defineProps<Props>()

defineExpose({
  toggleRef,
  blur,
})
</script>

<style module src="./Navbar.module.scss"></style>
