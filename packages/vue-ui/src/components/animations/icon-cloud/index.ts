import type { HTMLAttributes } from 'vue'

export type SphereIcon = {
  x: number
  y: number
  z: number
  scale: number
  opacity: number
  id: number
}

export type IconCloudProps = {
  class?: HTMLAttributes['class']
  images?: Array<string>
}

export { default as IconCloud } from './IconCloud.vue'
