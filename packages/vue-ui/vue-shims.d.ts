declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line -- IGNORE ---
  const component: DefineComponent<{}, {}, any>
  export default component
}
