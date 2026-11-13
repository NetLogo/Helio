import {
  toUserSelectMenuItem,
  type UserSelectMenuItem,
} from "~/components/user/UserSelectMenu.vue";

export function useUserFilter(
  filters: Ref<{ authorId?: string }>,
  setFilter: (key: "authorId", value: string | undefined) => void,
) {
  const { query: searchTerm, users, loadNextPage, canLoadMore, pending } = useUsers();

  const selected = ref<UserSelectMenuItem>();

  watch(
    () => filters.value.authorId,
    async (authorId) => {
      if (authorId) {
        const user = await fetchUserById(authorId);
        selected.value = toUserSelectMenuItem(user as UserProfile);
      } else {
        selected.value = undefined;
      }
    },
    { immediate: true },
  );

  watch(selected, (user) => {
    setFilter("authorId", user?.value as string | undefined);
  });

  return {
    selected,
    searchTerm,
    users,
    loadNextPage,
    canLoadMore,
    pending,
  };
}
