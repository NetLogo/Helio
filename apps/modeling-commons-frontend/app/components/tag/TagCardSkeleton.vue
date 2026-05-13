<template>
  <NuxtLink class="group/user block w-fit">
    <UUser
      name="NetLogo Model Tag"
      description="Description of the tag goes here."
      size="3xl"
      :avatar="{
        src: 'https://i.pravatar.cc/150?u=john-doe',
      }"
      class="w-fit"
    >
      <template #avatar="{ ui }">
        <div
          class="inline-flex items-center justify-center select-none rounded-full align-middle bg-royal-blue-lighter size-12 text-2xl"
          :class="ui.avatar($props)"
        >
          <UIcon name="i-lucide-hash" />
        </div>
      </template>
      <template #name>
        <div class="skeleton-box h-5 w-40" />
      </template>
      <template #description>
        <div class="skeleton-box w-30 h-4" />
      </template>
    </UUser>
  </NuxtLink>
</template>

<script setup lang="ts"></script>
