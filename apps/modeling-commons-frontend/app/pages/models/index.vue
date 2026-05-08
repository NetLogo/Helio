<template>
  <UContainer>
    <div class="space-y-8">
      <div class="space-y-2">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <SearchBar
              :model-value="filters.keyword"
              autofocus
              @update:model-value="onKeywordChange"
            />
          </div>
          <USlideover :ui="{ content: 'space-y-2 lg:min-w-120' }">
            <UButton icon="i-lucide-sliders-horizontal" size="sm"> Filter and Sort </UButton>

            <template #content>
              <div class="flex justify-between items-center border-0">
                <h5>Filter & Sort</h5>
                <UButton variant="link" size="xs" @click="resetFilters()"> Clear All </UButton>
              </div>

              <div class="space-y-8 mt-2 border-0">
                <div class="flex flex-col gap-3">
                  <span class="text-start wrap-break-word text-md font-medium py-1">Sort by</span>
                  <URadioGroup
                    v-model="filters.sortBy"
                    variant="card"
                    default-value="recent"
                    :items="[
                      { label: 'Date Published', value: 'recent' },
                      { label: 'Oldest', value: 'oldest' },
                      { label: 'Likes', value: 'likes' },
                      { label: 'Views', value: 'views' },
                      { label: 'Downloads', value: 'downloads' },
                    ]"
                  />
                </div>

                <div class="flex flex-col gap-3">
                  <span class="text-start wrap-break-word text-md font-medium py-1"
                    >Types of Models</span
                  >
                  <div class="flex gap-4 flex-wrap">
                    <UButton
                      v-for="{ key, label } in [
                        { key: 'isLibraryModel', label: 'NetLogo Library' },
                        { key: 'isEndorsed', label: 'Endorsed by NetLogo' },
                      ]"
                      :key="key"
                      variant="subtle"
                      color="neutral"
                      size="xs"
                      >{{ label }}</UButton
                    >
                  </div>
                </div>

                <div class="flex flex-col gap-3">
                  <span class="text-start wrap-break-word text-md font-medium py-1"
                    >Publish Date</span
                  >
                  <div>
                    <div class="flex gap-6 w-full">
                      <UFormField label="From" class="w-full">
                        <UInput type="date" label="From" />
                      </UFormField>
                      <UFormField label="To" class="w-full">
                        <UInput type="date" label="To" />
                      </UFormField>
                    </div>
                  </div>
                </div>
              </div>

              <UButton variant="solid" color="primary" class="mt-auto" block @click="refresh()">
                See Results
              </UButton>
            </template>
          </USlideover>
        </div>

        <div class="flex gap-3">
          <UserSelectMenu
            v-model="selectedUser"
            v-model:search-term="usersQuery"
            :users
            :load-next-page="usersLoadNextPage"
            :can-load-more="usersCanLoadMore"
            :loading="usersPending"
            class="flex-1 lg:min-w-80"
          />
          <TagSelectMenu
            v-model="selectedTags"
            v-model:search-term="tagsQuery"
            :tags="tags"
            :load-next-page="tagsLoadNextPage"
            :can-load-more="tagsCanLoadMore"
            :loading="tagsPending"
            class="flex-1 lg:min-w-80"
          />
          <NetLogoVersionSelectMenu
            v-model="selectedNetLogoVersion"
            v-model:search-term="netLogoVersionsQuery"
            :versions="netLogoVersions ?? []"
            :loading="netLogoVersionsPending"
            class="flex-1 lg:min-w-60"
          />
        </div>
      </div>

      <div v-if="error" class="text-center py-16">
        <UIcon name="i-lucide-wifi-off" class="size-14 text-dimmed mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-toned">Something went wrong</h2>
        <p class="text-muted mt-1">{{ error.message }}</p>
        <UButton variant="outline" class="mt-4" @click="refresh()"> Try again </UButton>
      </div>

      <div v-else class="flex flex-col gap-8 relative">
        <ModelTable
          :ref="table"
          :key="instanceKey"
          :models="rows"
          :loading="pending"
          :class="{
            'pointer-events-none opacity-50': pending,
          }"
          :can-load-more="hasMore"
          @reset-filters="resetFilters()"
          @on-load-more="nextPage()"
        />
      </div>

      <p v-if="totalCount > 0" class="mx-auto text-center text-xs text-dimmed">
        Showing {{ rows.length }} of {{ totalCount }} models
      </p>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import {
  toNetLogoVersionItem,
  type NetLogoVersionItem,
} from "~/components/NetLogoVersionSelectMenu.vue";
import { toTagSelectMenuItem, type TagItem } from "~/components/TagSelectMenu.vue";
import { toUserSelectMenuItem, type UserSelectMenuItem } from "~/components/UserSelectMenu.vue";

useSeoMeta({
  title: "Explore Models",
  description: "Browse and discover agent-based simulations shared by the NetLogo community.",
  ogTitle: "Explore Models",
  ogDescription: "Browse and discover agent-based simulations shared by the NetLogo community.",
});

const table = ref();

const {
  rows,
  totalCount,
  filters,
  pending,
  error,
  hasMore,
  instanceKey,
  refresh,
  setFilter,
  nextPage,
  resetFilters,
} = useModels();

const {
  query: usersQuery,
  users,
  loadNextPage: usersLoadNextPage,
  canLoadMore: usersCanLoadMore,
  pending: usersPending,
} = useUsers();
const selectedUser = ref<UserSelectMenuItem>();

watch(
  () => filters.value.authorId,
  async (authorId) => {
    if (authorId) {
      const user = await fetchUserById(useApi(), authorId);
      selectedUser.value = toUserSelectMenuItem(user as ApiUser);
    } else {
      selectedUser.value = undefined;
    }
  },
  { immediate: true },
);

watch(selectedUser, (user) => {
  setFilter("authorId", user?.value as string);
});

const {
  prefix: tagsQuery,
  tags,
  loadNextPage: tagsLoadNextPage,
  canLoadMore: tagsCanLoadMore,
  pending: tagsPending,
} = useTags();
const selectedTags = ref<Array<TagItem>>([]);

const {
  prefix: netLogoVersionsQuery,
  versions: netLogoVersions,
  pending: netLogoVersionsPending,
} = useNetLogoVersions();
const selectedNetLogoVersion = ref<NetLogoVersionItem>();

watch(
  () => filters.value.netlogoVersion,
  (version) => {
    selectedNetLogoVersion.value = version ? toNetLogoVersionItem(version) : undefined;
  },
  { immediate: true },
);

watch(selectedNetLogoVersion, (item) => {
  setFilter("netlogoVersion", item?.value);
});

watch(
  () => filters.value.tags,
  async (tags) => {
    if (tags) {
      const tagList = await Promise.all(
        tags.map(async (tagName) => {
          const tag = await fetchTagByIdOrName(useApi(), tagName);
          return toTagSelectMenuItem(
            tag ?? { displayName: tagName, name: tagName, value: tagName },
          );
        }),
      );
      selectedTags.value = tagList;
    } else {
      selectedTags.value = [];
    }
  },
  { immediate: true },
);

const indicator = useLoadingIndicator();
watch(pending, (isLoading) => {
  if (isLoading) indicator.start();
  else indicator.finish();
});

let keywordTimeout: ReturnType<typeof setTimeout>;
function onKeywordChange(value: string | number) {
  clearTimeout(keywordTimeout);
  keywordTimeout = setTimeout(() => {
    void setFilter("keyword", String(value));
  }, 300);
}
</script>
