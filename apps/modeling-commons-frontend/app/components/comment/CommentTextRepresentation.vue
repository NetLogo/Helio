<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ text: string }>();

const URL_RE = /(https?:\/\/[^\s]+)/g;

const BRACKET_OPENERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function countChar(value: string, char: string): number {
  let count = 0;
  for (const c of value) if (c === char) count++;
  return count;
}

// Trailing closers balanced by an opener inside the URL belong to the URL
// (e.g. wikipedia.org/wiki/Rust_(programming_language)); only unbalanced
// ones are surrounding punctuation.
function splitTrailingPunct(url: string): [string, string] {
  const m = url.match(/[.,;:!?)\]}'"]+$/);
  if (!m) return [url, ""];
  let base = url.slice(0, -m[0].length);
  let trailing = m[0];
  while (trailing.length > 0) {
    const closer = trailing[0]!;
    const opener = BRACKET_OPENERS[closer];
    if (!opener || countChar(base, opener) <= countChar(base, closer)) break;
    base += closer;
    trailing = trailing.slice(1);
  }
  return [base, trailing];
}

function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

const segments = computed(() =>
  props.text.split(URL_RE).flatMap((part, i) => {
    if (i % 2 === 0) return part ? [{ text: part }] : [];
    const [url, trailing] = splitTrailingPunct(part);
    const href = safeHref(url);
    const urlSeg = href ? { text: url, href } : { text: url };
    return trailing ? [urlSeg, { text: trailing }] : [urlSeg];
  })
);
</script>


<template>
  <p>
    <template v-for="(seg, i) in segments" :key="i">
      <a
        v-if="seg.href"
        :href="seg.href"
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {{ seg.text }}
      </a>
      <template v-else>{{ seg.text }}</template>
    </template>
  </p>
</template>
