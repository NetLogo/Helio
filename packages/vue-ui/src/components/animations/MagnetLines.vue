<!-- https://github.com/DavidHDev/vue-bits under MIT License -->
<script setup lang="ts">
import { onMounted, onUnmounted, computed, useTemplateRef } from 'vue'

type MagnetLinesProps = {
  rows?: number
  columns?: number
  containerSize?: string
  lineColor?: string
  lineWidth?: string
  lineHeight?: string
  baseAngle?: number
  className?: string
  style?: Record<string, string | number>
  lineAsset?: string
}

const props = withDefaults(defineProps<MagnetLinesProps>(), {
  rows: 9,
  columns: 9,
  containerSize: '80vmin',
  lineColor: '#efefef',
  lineWidth: '1vmin',
  lineHeight: '6vmin',
  baseAngle: -10,
  className: '',
  style: () => ({}),
  lineAsset: undefined,
})

const containerRef = useTemplateRef<HTMLDivElement>('containerRef')

const total = computed(() => props.rows * props.columns)

const onPointerMove = (pointer: { x: number; y: number }): void => {
  const container = containerRef.value
  if (!container) return

  const items = container.querySelectorAll<HTMLSpanElement>('span')

  items.forEach((item) => {
    const rect = item.getBoundingClientRect()
    const centerX = rect.x + rect.width / 2
    const centerY = rect.y + rect.height / 2

    const b = pointer.x - centerX
    const a = pointer.y - centerY
    const c = Math.sqrt(a * a + b * b) || 1
    const r = ((Math.acos(b / c) * 180) / Math.PI) * (pointer.y > centerY ? 1 : -1)

    item.style.setProperty('--rotate', `${r}deg`)
  })
}

const handlePointerMove = (e: PointerEvent): void => {
  onPointerMove({ x: e.x, y: e.y })
}

onMounted(() => {
  const container = containerRef.value
  if (!container) return

  window.addEventListener('pointermove', handlePointerMove)

  const items = container.querySelectorAll<HTMLSpanElement>('span')
  if (items.length) {
    const middleIndex = Math.floor(items.length / 2)
    const rect = items[middleIndex]?.getBoundingClientRect() ?? { x: 0, y: 0 }
    onPointerMove({ x: rect.x, y: rect.y })
  }
})

onUnmounted(() => {
  window.removeEventListener('pointermove', handlePointerMove)
})
</script>

<template>
  <div
    ref="containerRef"
    :class="`grid place-items-center ${props.className}`"
    :style="{
      gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
      gridTemplateRows: `repeat(${props.rows}, 1fr)`,
      width: props.containerSize,
      height: props.containerSize,
      ...props.style,
    }"
  >
    <span
      v-for="i in total"
      :key="`line-${i}`"
      class="block origin-center"
      :style="{
        backgroundColor: props.lineAsset ? 'transparent' : props.lineColor,
        width: props.lineWidth,
        height: props.lineHeight,
        '--rotate': `${props.baseAngle}deg`,
        transform: 'rotate(var(--rotate))',
        willChange: 'transform',
      }"
    >
      <img v-if="props.lineAsset" :src="props.lineAsset" />
    </span>
  </div>
</template>
