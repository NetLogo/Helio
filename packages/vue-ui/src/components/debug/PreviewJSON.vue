<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <pre><code v-html="html" /></pre>
</template>

<script lang="ts" setup>
const props = defineProps<{
  content: Record<string, any>
}>()

function safeStringify(value: unknown): string {
  const seen = new WeakSet()
  try {
    return (
      JSON.stringify(
        value,
        (_k, v) => {
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) return '(Circular)'
            seen.add(v)
          }
          if (typeof v === 'undefined') return '(Undefined)'
          if (typeof v === 'function') return `(Function: ${v.name || 'anonymous'})`
          if (typeof v === 'bigint') return `${v.toString()}n`
          return v
        },
        2
      ) ?? ''
    )
  } catch (e) {
    return `(Stringify error: ${(e as Error).message})`
  }
}

const html = computed(() => {
  const contentString = safeStringify(props.content)
  if (!contentString) return ''

  return contentString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d*)?([eE][+-]?\d+)?|[{}\[\]])/g,
      (match) => {
        let cls = 'number'
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'key' : 'string'
        } else if (/true|false/.test(match)) {
          cls = 'boolean'
        } else if (/null/.test(match)) {
          cls = 'null'
        } else if (/[{}\[\]]/.test(match)) {
          cls = 'brace'
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
})
</script>

<style scoped>
pre {
  background-color: #1f242f;
  color: #abb2bf;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.5;
}

pre :deep(.brace) {
  color: #abb2bf;
}
pre :deep(.key) {
  color: #e06c75;
}
pre :deep(.string) {
  color: #98c379;
}
pre :deep(.number) {
  color: #d19a66;
}
pre :deep(.boolean) {
  color: #56b6c2;
}
pre :deep(.null) {
  color: #c678dd;
}
</style>
