<template>
  <div class="grid gap-8">
    <AuthPageIntro
      icon="i-lucide-sparkles"
      title="Welcome to Modeling Commons"
      description="Understanding complexity, together."
    />

    <section class="grid gap-3">
      <p class="m-0 text-sm text-muted leading-relaxed">
        We believe everyone should be able to build and use models, without barriers. Modeling
        Commons is a space to share ideas, learn from one another, and collaborate on what's
        possible, together.
      </p>
    </section>

    <section class="grid gap-3">
      <h2 class="m-0 text-base font-medium text-highlighted">Community guidelines</h2>
      <ul class="grid gap-2 m-0 p-0 list-none">
        <li
          v-for="item in guidelines"
          :key="item.title"
          class="flex items-start gap-3 text-sm text-toned"
        >
          <UIcon :name="item.icon" class="text-primary text-lg shrink-0 mt-0.5" />
          <span
            ><strong class="text-highlighted font-medium">{{ item.title }}.</strong>
            {{ item.body }}</span
          >
        </li>
      </ul>
    </section>

    <section class="grid gap-3">
      <h2 class="m-0 text-base font-medium text-highlighted">What you can do here</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <UCard
          v-for="action in actions"
          :key="action.title"
          variant="subtle"
          :ui="{ body: 'p-4 sm:p-4 grid gap-2' }"
        >
          <UIcon :name="action.icon" class="text-primary text-xl" />
          <h3 class="m-0 text-sm font-medium text-highlighted">{{ action.title }}</h3>
          <p class="m-0 text-xs text-muted leading-relaxed">{{ action.body }}</p>
        </UCard>
      </div>
    </section>

    <div class="grid gap-3">
      <UButton
        class="w-full justify-center"
        size="lg"
        :loading="isFinishing"
        variant="solid"
        @click="finish"
      >
        Get started
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getSafeNextPath } from "~/utils/auth";

definePageMeta({
  layout: "auth",
  middleware: "auth",
});

useSeoMeta({
  title: "Welcome to Modeling Commons",
  description: "A quick intro to the community before you dive in.",
});

const route = useRoute();
const toast = useToast();
const { completeOnboarding } = useOnboarding();

const isFinishing = ref(false);
const nextPath = computed(() => getSafeNextPath(route.query.next));

const guidelines = [
  {
    icon: "i-lucide-heart-handshake",
    title: "Be respectful",
    body: "Engage thoughtfully and assume good faith in others' work and feedback.",
  },
  {
    icon: "i-lucide-quote",
    title: "Credit your sources",
    body: "When you fork or build on someone's model, attribute it clearly.",
  },
  {
    icon: "i-lucide-share-2",
    title: "Share openly",
    body: "Default to public so others can learn from and remix your work.",
  },
];

const actions = [
  {
    icon: "i-lucide-compass",
    title: "Browse models",
    body: "Explore the community's work and find inspiration.",
  },
  {
    icon: "i-lucide-upload",
    title: "Upload your own",
    body: "Share a NetLogo model you've built with the community.",
  },
  {
    icon: "i-lucide-git-fork",
    title: "Fork & remix",
    body: "Start from someone else's model and make it your own.",
  },
  {
    icon: "i-lucide-users",
    title: "Collaborate",
    body: "Work with others to build models and share feedback.",
  },
];

async function finish() {
  if (isFinishing.value) return;
  isFinishing.value = true;
  try {
    await completeOnboarding();
    navigateTo(nextPath.value);
  } catch (error) {
    isFinishing.value = false;
    toast.add({
      title: "Couldn't save your progress",
      description: "Please try again in a moment.",
      color: "error",
    });
    if (import.meta.dev) {
      console.error("Error completing onboarding:", error);
    }
    void error;
  }
}
</script>
