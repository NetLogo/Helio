<script setup lang="ts">
const route = useRoute();
const api = useApi();
const user = useUser();

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

const isProfilePublic = computed(() => profile.value?.isProfilePublic);

// A private profile must not leak the member's name into a title or an index.
// The template already hides the body; without this the name still ships in
// <title>, og:title and the SERP snippet.
const seoMeta = computed(() => {
  if (error.value) {
    return {
      title: defaultStrings.unavailableProfileName,
      description: defaultStrings.unavailableProfileDescription,
      indexable: false,
    };
  }
  if (profile.value && !isProfilePublic.value) {
    return {
      title: defaultStrings.privateProfileName,
      description: defaultStrings.privateProfileDescription,
      indexable: false,
    };
  }
  if (profile.value) {
    return {
      title: `${profile.value.name}'s Profile`,
      description: `NetLogo models shared by ${profile.value.name} on Modeling Commons.`,
      indexable: true,
    };
  }
  return { title: "User Profile", description: undefined, indexable: false };
});

useSeoMeta({
  title: () => seoMeta.value.title,
  description: () => seoMeta.value.description,
  ogTitle: () => seoMeta.value.title,
  ogDescription: () => seoMeta.value.description,
  ogType: "profile",
  robots: () => (seoMeta.value.indexable ? undefined : "noindex, nofollow"),
});

const isMyself = computed(() => user.value?.user?.id === id);

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
    <Error
      v-else-if="!profile"
      title="User Not Found"
      message="The user profile you are looking for does not exist."
      class="min-h-150"
      :action="{ label: 'Browse models', to: '/models' }"
    />
    <Error
      v-else-if="!isProfilePublic && !isMyself"
      title="Private Profile"
      message="This user's profile is private."
      icon="i-lucide-lock"
      :action="{ label: 'Browse models', to: '/models' }"
      class="min-h-150"
    />
    <main v-else-if="profile" class="space-y-10">
      <!-- User Header -->
      <UserHeader
        :name="profile.name ?? undefined"
        :image="profile.image"
        :country="profile.country"
        :affiliation="profile.affiliation"
        :created-at="profile.createdAt"
        :social-links="profile.socialLinks"
        :is-myself="isMyself"
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
        <div class="flex w-full justify-between items-center">
          <h6>My Models</h6>
          <UButton variant="ghost" size="sm" :to="`/users/${id}/models`" class="ml-auto">
            <span
              v-text="
                models && models.count > 1 ? `See all ${models.count} models` : 'See all models'
              "
            />
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
