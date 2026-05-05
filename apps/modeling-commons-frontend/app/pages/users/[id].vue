<script setup lang="ts">
import Middot from "~/components/utility-components/Middot.vue";
import SocialLink from "~/components/utility-components/SocialLink.vue";

const route = useRoute();
const api = useApi();

const id = route.params.id as string;

const {
  data: profile,
  error,
  status,
} = useAsyncData<UserProfile | null>(`profile-${id}`, async () => {
  const { data, error } = await api.GET("/api/v1/users/{id}", {
    params: { path: { id } },
  });

  return handleApiError(data, error, "fetching user profile");
});

const {
  data: models,
  error: modelsError,
  status: modelsStatus,
} = await useAsyncData<ModelCard[]>(`models-by-user-${id}`, async () => {
  const { data, error } = await api.GET("/api/v1/models", {
    params: { query: { authorId: id } },
  });

  const safeData = handleApiError(data, error, "fetching models");

  const cardList = await Promise.all(safeData.data.map((m) => fetchCards(api, [m.id])));
  return cardList.flat() as ModelCard[];
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
      <section class="flex gap-6 items-center">
        <UserAvatar
          :src="profile.image"
          :name="profile.name"
          class="size-25 sm:size-30 lg:size-35"
          variant="compact"
        />
        <div class="space-y-2">
          <h4 class="mb-0">
            {{ profile.name }}
          </h4>
          <Country
            v-if="profile.country"
            :query="profile.country"
            class="text-xs text-muted align-middle"
          />
          <p class="text-sm text-muted font-medium flex flex-wrap gap-1 lg:gap-3">
            <span v-if="profile.createdAt">Joined {{ formatRelativeDate(profile.createdAt) }}</span>
            <Middot v-if="profile.createdAt && profile.affiliation" />
            <span v-if="profile.affiliation">{{ profile.affiliation }}</span>
          </p>
          <div v-if="profile.socialLinks" class="flex gap-6">
            <SocialLink
              v-for="(link, index) in profile.socialLinks"
              :key="index"
              v-bind="link"
              variant="compact"
              class="text-2xl"
            />
          </div>
        </div>
      </section>
      <USeparator />
      <section class="space-y-4">
        <h6>About Me</h6>
        <p v-if="!profile.bio" class="text-muted">This user has not added a bio yet.</p>
        <p v-else class="max-w-3xl text-muted text-pretty">{{ profile.bio }}</p>
      </section>
      <section class="space-y-4">
        <h6>My Models</h6>
        <div v-if="modelsStatus === 'pending'">Loading models...</div>
        <UError v-else-if="modelsError" :error="modelsError" />
        <div v-else class="grid grid-cols-1 sm:grid-cols-4 gap-8">
          <ModelCard v-for="card in models" :key="card.model.id" :card="card" />
        </div>
      </section>
    </main>
  </UContainer>
</template>
