<!-- app/components/ModelCardSkeleton.vue -->
<template>
  <BaseCard class="animate-pulse">
    <template #cover>
      <div class="h-40 bg-slate-100" />
    </template>
    <template #body>
      <div class="space-y-3">
        <div class="h-4 w-3/4 bg-slate-200 rounded" />
        <div class="h-3 w-full bg-slate-100 rounded" />
        <div class="h-3 w-1/2 bg-slate-100 rounded" />
      </div>
    </template>
  </BaseCard>
</template>
