<template>
  <div class="flex items-center gap-2">
    <UAvatarGroup :max="3">
      <UAvatar
        v-for="(author, index) in authors"
        :key="index"
        :name="author.userName ?? 'Anonymous'"
        :src="author.userImage ?? undefined"
        size="sm"
        :alt="author.userName ?? 'Anonymous'"
      />
    </UAvatarGroup>
    <NuxtLink
      class="font-medium hover:underline text-royal-blue-dark"
      :to="getAuthorUrl(primaryAuthor)"
    >
      {{ primaryAuthor?.userName ?? "Anonymous" }}
    </NuxtLink>
    <UTooltip>
      <span v-if="authors.length > 1" class="hover:cursor-pointer">
        and {{ authors.length - 1 }} {{ pluralize(authors.length - 1, "other", "others") }}
      </span>
      <template #content>
        <div class="space-y-2">
          <p class="text-sm font-semibold">Authors</p>
          <NuxtLink
            v-for="(author, index) in authors"
            :key="index"
            class="flex items-center gap-2 group/author-link"
            :to="getAuthorUrl(author)"
          >
            <UAvatar
              :name="author.userName ?? 'Anonymous'"
              :src="author.userImage ?? undefined"
              size="xs"
              :alt="author.userName ?? 'Anonymous'"
            />
            <span class="font-medium group-hover/author-link:underline text-royal-blue-dark">
              {{ author.userName }}
              <span class="text-muted text-xs">({{ getAuthorRoleString(author) }})</span>
            </span>
          </NuxtLink>
        </div>
      </template>
    </UTooltip>
  </div>
</template>

<script lang="ts">
// @shared
export type Author = {
  userId: string;
  userName?: string | null;
  userImage?: string | null;
  role?: string;
};

export const getAuthorUrl = (author: Pick<Author, "userId" | "userName"> | undefined) => {
  if (!author) return "#";
  return createSlugPath("users", author.userId, author.userName ?? "anonymous");
};

export const getPrimaryAuthor = (authors: Author[]): Author | undefined => {
  return authors.find((a) => a.role === "owner") ?? authors[0];
};

export const getAuthorRoleString = (author: Author) => {
  switch (author.role) {
    case "owner":
      return "Author";
    case "contributor":
      return "Contributor";
    default:
      return "Participant";
  }
};
</script>

<script setup lang="ts">
const props = defineProps<{
  authors: Array<Author>;
}>();

const primaryAuthor = computed(
  () => props.authors.find((a) => a.role === "owner") ?? props.authors[0],
);
</script>
