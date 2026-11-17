export const modelLiterals = {
  sortByOptions: [
    { label: "Date Published", value: "recent" },
    { label: "Likes", value: "likes" },
    { label: "Views", value: "views" },
    { label: "Downloads", value: "downloads" },
  ],
  orderIcons: {
    asc: "i-lucide-arrow-up-narrow-wide",
    desc: "i-lucide-arrow-down-narrow-wide",
  },
  typeFilterOptions: [
    { key: "isLibraryModel", label: "NetLogo Library" },
    { key: "isEndorsed", label: "Endorsed by NetLogo" },
  ],
  indexSeoMeta: {
    title: "Explore Models",
    description: "Browse and discover agent-based simulations shared by the NetLogo community.",
    ogTitle: "Explore Models",
    ogDescription: "Browse and discover agent-based simulations shared by the NetLogo community.",
  },
  actions: {
    download: { action: "download", label: "Download", icon: "i-lucide-download" },
    embed: { action: "embed", label: "Embed", icon: "i-lucide-code" },
    fork: { action: "fork", label: "Fork", icon: "i-lucide-git-fork" },
    bookmark: { action: "bookmark", label: "Bookmark", icon: "i-lucide-bookmark" },
    edit: { action: "edit", label: "Edit", icon: "i-lucide-square-pen" },
    delete: { action: "delete", label: "Delete", icon: "i-lucide-trash-2" },
  },
} as const satisfies {
  sortByOptions: ReadonlyArray<{ label: string; value: ModelSortBy }>;
  orderIcons: Record<ModelOrder, string>;
  typeFilterOptions: ReadonlyArray<{ key: keyof ModelsFilters; label: string }>;
  indexSeoMeta: Record<string, string>;
  actions: Record<string, { action: string; label: string; icon: string }>;
};
