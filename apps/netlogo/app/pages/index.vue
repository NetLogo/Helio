<template>
  <main>
    <h1>Welcome to {{ meta.name }}</h1>
    <p>This is the home page for the NetLogo application.</p>
  </main>
</template>

<script setup lang="ts">
import { useWebsite } from "~/composables/useWebsite";
const meta = useWebsite();
</script>
