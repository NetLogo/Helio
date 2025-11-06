<template>
  <div
    :class="$style['loader']"
    aria-label="Loading..."
    role="status"
    :style="cssVariable('--spinner-size', size ?? '40px')"
  />
</template>

<script setup lang="ts">
import { cssVariable, type CSSSize } from '../lib/styles'

type Props = {
  size?: CSSSize
}

defineProps<Props>()
</script>

<style module src="./spinner/Spinner.module.scss"></style>
