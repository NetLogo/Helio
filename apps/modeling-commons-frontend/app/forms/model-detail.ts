export const modelActions = {
  download: {
    action: "download",
    label: "Download Model",
    icon: "i-lucide-download",
    description: "Download the model file to your computer",
  },
  embed: {
    action: "embed",
    label: "Embed Model",
    icon: "i-lucide-code",
    description: "Embed this model in a webpage",
  },
  fork: {
    action: "fork",
    label: "Fork Model",
    icon: "i-lucide-git-fork",
    description: "Create a new model based on this one",
  },
  bookmark: {
    action: "bookmark",
    label: "Bookmark Model",
    icon: "i-lucide-bookmark",
    description: "Add this model to your bookmarks",
  },
} as const;
