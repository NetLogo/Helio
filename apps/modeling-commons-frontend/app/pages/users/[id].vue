<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;
const { profile, error, status, refresh } = await useProfileView(id);
</script>

<template>
  <div v-if="status === 'pending'">Loading...</div>
  <div v-else-if="error">{{ error }}</div>
  <div v-else-if="profile">
    <h1>{{ profile.name }}</h1>
    <p v-if="profile.bio">{{ profile.bio }}</p>
  </div>
  <div v-else>User not found.</div>
</template>
