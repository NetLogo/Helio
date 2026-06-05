<template>
  <USelectMenu
    ref="selectMenu"
    v-model="selectedUser"
    v-model:search-term="searchTerm"
    placeholder="Author"
    :items="userMenuItems"
    virtualize
  >
    <template #empty>
      <UEmpty
        icon="i-lucide-users"
        title="No users found"
        description="Try adjusting your search."
        variant="naked"
      />
    </template>
    <template #leading>
      <UserAvatar
        v-if="selectedUser"
        v-bind="selectedUser.avatar"
        variant="compact"
        size="xs"
        class="size-5"
      />
      <UIcon v-else name="i-lucide-user-circle" class="size-5 text-muted" />
    </template>
  </USelectMenu>
</template>

<script lang="ts">
import { useInfiniteScroll } from "@vueuse/core";
import type { ApiUser } from "~/composables/user/useUsers";
export const toUserSelectMenuItem = (user: ApiUser) => ({
  label: user.name ?? "Unknown User",
  value: user.id,
  avatar: {
    name: user.name ?? undefined,
    src: user.image ?? undefined,
    alt: user.name ?? "User Avatar",
  },
});
</script>

<script setup lang="ts">
export type UserSelectMenuItem = {
  label: string;
  value: string;
  avatar?: {
    name?: string;
    src?: string;
  };
};

const props = defineProps<{
  users: Array<ApiUser>;
  loading: boolean;
  loadNextPage: () => void;
  canLoadMore: boolean;
}>();

const userMenuItems = computed<UserSelectMenuItem[]>(() => {
  if (selectedUser.value && !props.users.length) {
    return [selectedUser.value];
  }
  return [...props.users.map(toUserSelectMenuItem)];
});
const selectedUser = defineModel<UserSelectMenuItem>({
  type: Object as () => UserSelectMenuItem,
  default: null,
});
const searchTerm = defineModel<string>("search-term", { type: String, default: "" });
const selectMenu = useTemplateRef("selectMenu");

onMounted(() => {
  useInfiniteScroll(
    // @ts-expect-error -- need to update @nuxt/ui for this to work
    // but this is a chore for later and won't cause issues in the
    // meantime
    // -- Omar Ibrahim, Jun 02 26
    () => selectMenu.value?.viewportRef,
    () => {
      props.loadNextPage();
    },
    {
      canLoadMore: () => {
        return props.canLoadMore;
      },
    },
  );
});
</script>
