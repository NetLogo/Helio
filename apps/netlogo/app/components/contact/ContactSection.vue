<template>
  <div class="container py-5 text-start">
    <h1 class="text-3xl lg:text-4xl font-bold mb-6">Contact</h1>

    <p v-if="contactData.length === 0" class="text-gray-600">No contact info available.</p>

    <div v-else>
      <div v-for="(item, index) in contactData" :key="index" class="mb-8">
        <h3 class="text-2xl font-medium text-gray-800 mb-3">{{ item.heading }}</h3>
        <div class="pl-5 leading-loose">
          <MDC :value="item.body" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ContactItem } from "~/utils/api";

defineProps<{
  contactData: ContactItem[];
}>();
</script>
