<template>
  <div class="references-container pt-4">
    <h1 class="text-5xl font-medium mb-6">References</h1>

    <p class="mb-5 text-lg">
      This page lists publications that have used or cited NetLogo software and/or models.
    </p>
    <p class="mb-5 text-lg">
      This list is by no means complete or exhaustive. If you are using and/or citing NetLogo in
      your work, or you know of work that is not listed, please send the relevant citations to
      <a class="underline text-blue-600 ms-1" href="mailto:netlogo-refs@ccl.northwestern.edu">
        netlogo-refs@ccl.northwestern.edu
      </a>
    </p>
    <p class="mb-5 text-lg">
      Google Scholar's database lists roughly 38,600 NetLogo citations. You can explore it
      <a
        class="underline text-blue-600 ms-1"
        href="https://scholar.google.com/scholar?hl=en&as_sdt=0%2C14&q=netlogo&btnG="
        target="_blank"
      >
        here
      </a>
    </p>
    <p class="mb-8 text-xl"><strong>Bold</strong> = Publications authored by the CCL</p>

    <div v-for="yearGroup in groupedReferences" :key="yearGroup.year" class="year-block mb-6">
      <h3 class="year-heading text-3xl font-semibold mb-5">{{ yearGroup.year }}</h3>
      <ul id="reference-entries" class="space-y-4">
        <li
          v-for="reference in yearGroup.references"
          :key="reference.id"
          :class="reference.is_ccl ? 'is-ccl' : ''"
        >
          {{ reference.reference }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import referencesData from "~/utils/exploreReferences.json";

interface ReferenceItem {
  id: number;
  year: number;
  is_ccl: boolean;
  reference: string;
}

interface YearGroup {
  year: number;
  references: ReferenceItem[];
}

const groupedReferences = computed<YearGroup[]>(() => {
  const groups = new Map<number, ReferenceItem[]>();

  for (const item of referencesData as ReferenceItem[]) {
    if (!groups.has(item.year)) {
      groups.set(item.year, []);
    }
    groups.get(item.year)?.push(item);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, refs]) => ({
      year,
      references: [...refs].sort((a, b) => a.reference.localeCompare(b.reference)),
    }));
});
</script>

<style scoped>
.year-heading {
  background: #def1ff;
  padding: 0.9rem 1.1rem;
}

.is-ccl {
  font-weight: 700;
}
</style>
