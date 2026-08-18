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

// Mirrors users/[id]/index.vue: a private member's name must not reach a title
// or an index, and a listing of someone's models is not useful to a crawler.
const seoMeta = computed(() => {
  if (error.value) {
    return {
      title: defaultStrings.unavailableProfileName,
      description: defaultStrings.unavailableProfileDescription,
      indexable: false,
    };
  }
  if (profile.value && !profile.value.isProfilePublic) {
    return {
      title: defaultStrings.privateProfileName,
      description: defaultStrings.privateProfileDescription,
      indexable: false,
    };
  }
  if (profile.value) {
    return {
      title: `Models by ${profile.value.name}`,
      description: `NetLogo models shared by ${profile.value.name} on Modeling Commons.`,
      indexable: true,
    };
  }
  return { title: "Models by Member", description: undefined, indexable: false };
});

useSeoMeta({
  title: () => seoMeta.value.title,
  description: () => seoMeta.value.description,
  ogTitle: () => seoMeta.value.title,
  ogDescription: () => seoMeta.value.description,
  robots: () => (seoMeta.value.indexable ? undefined : "noindex, nofollow"),
});

const {
  data,
  error: modelsError,
  pending,
  loadNextPage,
  canLoadMore,
  count,
} = await useApiPagination(`models-by-user-${id}`, async (page) => {
  const { data, error } = await api.GET("/api/v1/models/card", {
    // By default, the query endpoint returns search-like results with
    // only public models. Setting `publicOnly=false` allows us to fetch
    // all models by the user (assuming the requester has the necessary permissions).
    // --Omar Ibrahim, May 14 26
    params: {
      query: {
        authorId: id,
        limit: 20,
        offset: (page - 1) * 20,
        publicOnly: false,
      },
    },
  });

  const safeData = handleApiError(data, error, "fetching models");

  return {
    data: safeData.data,
    count: safeData.count,
    limit: safeData.limit,
    page: safeData.page,
  };
});

if (error.value) {
  showError(error.value);
}

const orientation = ref<"horizontal" | "vertical">("horizontal");
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
        <div v-else class="space-y-6">
          <ModelCardsOrientationSelect v-model="orientation" class="justify-end" />

          <ModelCards
            :cards="data"
            :loading="pending"
            :can-load-more="canLoadMore"
            :orientation="orientation"
            :class="{ 'pointer-events-none opacity-50': pending }"
            :error="error ?? undefined"
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
