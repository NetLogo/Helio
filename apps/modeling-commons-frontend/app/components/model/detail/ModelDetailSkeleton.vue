<template>
  <UCard
    :ui="{
      root: 'divide-none',
      body: 'space-y-12 sm:p-8',
    }"
  >
    <section class="flex flex-col gap-8">
      <section class="flex flex-col gap-2">
        <div class="skeleton-box rounded h-9 w-full max-w-sm lg:max-w-lg" />
        <div class="skeleton-box rounded h-5 w-full max-w-lg lg:max-w-2xl" />
      </section>
      <div class="skeleton-box rounded h-3 w-full max-w-lg lg:max-w-2xl" />
      <div class="flex flex-wrap gap-3">
        <div v-for="i in 3" :key="i" class="skeleton-box rounded h-7 w-25" />
      </div>

      <div class="w-full aspect-square skeleton-box rounded-lg mt-5" />
      <div class="flex justify-between">
        <div class="skeleton-box rounded h-3 w-full max-w-sm" />
        <div class="flex gap-3">
          <div class="skeleton-box rounded h-9 w-20" />
          <div class="skeleton-box rounded h-9 w-10" />
          <div class="skeleton-box rounded h-9 w-10" />
        </div>
      </div>
      <div class="w-full h-50 skeleton-box rounded-lg" />
    </section>
  </UCard>
</template>
