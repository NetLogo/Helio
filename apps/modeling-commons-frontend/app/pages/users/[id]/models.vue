<script setup lang="ts">
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
  data,
  error: modelsError,
  pending,
  loadNextPage,
  canLoadMore,
  count,
} = await useApiPagination(`models-by-user-${id}`, async (page) => {
  const { data, error } = await api.GET("/api/v1/models", {
    params: { query: { authorId: id, limit: 20, offset: (page - 1) * 20 } },
  });

  const safeData = handleApiError(data, error, "fetching models");

  const cardList = await Promise.all(safeData.data.map((m) => fetchCards(api, [m.id])));
  return {
    data: cardList.flat() as ModelCard[],
    count: safeData.count,
    limit: safeData.limit,
    page: safeData.page,
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

      <!-- Models -->
      <section class="space-y-4">
        <div class="flex w-full justify-between">
          <h6>All Models by {{ profile.name }}</h6>
        </div>

        <div v-if="pending">Loading models...</div>
        <UError v-else-if="modelsError" :error="modelsError" />
        <div v-else class="space-y-5">
          <ModelTable
            :models="data!"
            :loading="pending"
            :can-load-more="canLoadMore"
            :class="{
              'pointer-events-none opacity-50': pending,
            }"
            @on-load-more="loadNextPage()"
          />
          <p class="w-full mx-auto text-center text-xs text-muted">
            Showing {{ data?.length }} of {{ count }}
          </p>
        </div>
      </section>
    </main>
  </UContainer>
</template>
