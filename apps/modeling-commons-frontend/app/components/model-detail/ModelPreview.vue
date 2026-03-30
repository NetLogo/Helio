<template>
  <div class="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
    <!-- <img v-if="previewUrl" :src="previewUrl" alt="Simulation preview" class="w-full h-auto object-cover" />
    <div v-else class="h-80 flex flex-col items-center justify-center gap-3 text-slate-400 bg-gradient-to-br from-blue-50 via-emerald-50 to-amber-50">
      <div class="absolute inset-0 opacity-[0.07]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="preview-dots" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="currentColor" class="text-blue-600" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#preview-dots)" />
        </svg>
      </div>
      <UIcon name="i-lucide-play-circle" class="size-16 text-blue-300" />
      <span class="text-sm font-medium">Simulation Preview</span>
      <span v-if="netlogoVersion" class="text-xs">NetLogo {{ netlogoVersion }}</span>
    </div> -->

  </div>
</template>

<script setup lang="ts">
defineProps<{
  previewUrl?: string | null;
  netlogoVersion?: string | null;
}>();
</script>
