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

    <div class="flex-row lg:flex items-start gap-12">
      <div class="mb-4 flex items-center gap-3">
        <span class="text-base font-semibold">Years:</span>
        <USelectMenu
          v-model="selectedYears"
          multiple
          :items="yearOptions"
          placeholder="Filter by year(s)"
          class="w-56"
        />
      </div>

      <div class="mb-4 flex items-center gap-3">
        <span class="text-base font-semibold">Subjects:</span>
        <USelectMenu
          v-model="selectedSubjects"
          multiple
          :items="subjectOptions"
          placeholder="Filter by subject(s)"
          class="w-80"
        />
      </div>
    </div>

    <div v-for="yearGroup in filteredReferences" :key="yearGroup.year" class="year-block mb-6">
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
  subject?: string;
}

interface YearGroup {
  year: number;
  references: ReferenceItem[];
}

const ALLOWED_SUBJECTS = [
  "Biology",
  "Ecology",
  "Archaeology",
  "Computer Science",
  "Economics",
  "History",
  "Physics",
  "Chemistry",
  "Urban Studies",
  "Social Science",
  "Education",
  "Epidemiology",
  "Miscellaneous",
] as const;

const selectedYears = ref<number[]>([]);
type AllowedSubject = (typeof ALLOWED_SUBJECTS)[number];
const selectedSubjects = ref<AllowedSubject[]>([]);

const allowedSubjectsSet = new Set<string>(ALLOWED_SUBJECTS);

const extractAllowedSubjects = (subjectText?: string): AllowedSubject[] => {
  if (!subjectText) {
    return [];
  }

  return subjectText
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter((part): part is AllowedSubject => allowedSubjectsSet.has(part));
};

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

const yearOptions = computed<number[]>(() => groupedReferences.value.map((group) => group.year));
const subjectOptions = [...ALLOWED_SUBJECTS];

const filteredReferences = computed<YearGroup[]>(() => {
  const byYear =
    selectedYears.value.length === 0
      ? groupedReferences.value
      : groupedReferences.value.filter((group) => selectedYears.value.includes(group.year));

  if (selectedSubjects.value.length === 0) {
    return byYear;
  }

  return byYear
    .map((group) => ({
      ...group,
      references: group.references.filter((reference) => {
        const subjects = extractAllowedSubjects(reference.subject);
        return selectedSubjects.value.some((subject) => subjects.includes(subject));
      }),
    }))
    .filter((group) => group.references.length > 0);
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
