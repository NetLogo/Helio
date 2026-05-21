<script setup lang="ts">
const route = useRoute();
const api = useApi();

const id = route.params.id as string;

const {
  data: profile,
  error,
  status,
} = await useAsyncData<UserProfile | null>(`profile-${id}`, async () => {
  const { data, error } = await api.GET("/api/v1/users/{id}", {
    params: { path: { id } },
  });

  return handleApiError(data, error, "fetching user profile");
});

useSeoMeta({
  title: () => profile.value ? `${profile.value.name}'s Profile` : "User Profile",
});

const {
  data: models,
  error: modelsError,
  status: modelsStatus,
} = await useAsyncData<{
  cards: ModelCard[];
  count: number;
}>(`models-by-user-${id}`, async () => {
  const { data, error } = await api.GET("/api/v1/models/card", {
    params: { query: { authorId: id, limit: 4, publicOnly: false } },
  });

  const safeData = handleApiError(data, error, "fetching models");

  return {
    cards: safeData.data,
    count: safeData.count,
  };
});

if (error.value) {
  showError(error.value);
}
</script>

<template>
  <UContainer>
    <div v-if="status === 'pending'">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <main v-else-if="profile" class="space-y-10">
      <!-- User Header -->
      <UserHeader
        :name="profile.name ?? undefined"
        :image="profile.image"
        :country="profile.country"
        :affiliation="profile.affiliation"
        :created-at="profile.createdAt"
        :social-links="profile.socialLinks"
      />

      <USeparator />

      <!-- About -->
      <section class="space-y-4">
        <h6>About Me</h6>
        <p v-if="!profile.bio" class="text-muted">This user has not added a bio yet.</p>
        <p v-else class="max-w-3xl text-muted text-pretty">{{ profile.bio }}</p>
      </section>

      <!-- Models -->
      <section class="space-y-4">
        <div class="flex w-full justify-between">
          <h6>My Models</h6>
          <UButton variant="ghost" size="sm" :to="`/users/${id}/models`" class="ml-auto">
            <span>See all</span>
            <span v-if="models">{{ pluralize(models.count, "model") }}</span>
          </UButton>
        </div>

        <div v-if="modelsStatus === 'pending'">Loading models...</div>
        <UError v-else-if="modelsError" :error="modelsError" />
        <div v-else class="grid grid-cols-1 sm:grid-cols-4 gap-8">
          <ModelCard v-for="card in models!.cards" :key="card.model.id" :card="card" />
        </div>
      </section>
    </main>
  </UContainer>
</template>
