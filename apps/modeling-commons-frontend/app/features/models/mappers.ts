export const getModelPreviewCard = ({
  file,
  permission,
  title,
  description,
  previewImageUrl,
  me,
}: {
  file?: { name: string } | null;
  permission?: string;
  title?: string;
  description?: string;
  previewImageUrl?: string | null;
  me: AuthenticatedUser;
}): ModelCard => {
  const now = new Date().toISOString();
  return {
    model: {
      id: "",
      createdAt: now,
      updatedAt: now,
      latestVersionNumber: 1,
      parentModelId: null,
      parentVersionNumber: null,
      visibility: (permission ?? "private") as "public" | "private" | "unlisted",
      isEndorsed: false,
      isLibraryModel: false,
    },
    latestVersion: {
      modelId: "",
      versionNumber: 1,
      title: title || file?.name || "Untitled Model",
      description: description || null,
      netlogoFileKey: null,
      netlogoVersion: null,
      infoTab: null,
      createdAt: now,
      isFinalized: false,
      netlogoFileDownloadUrl: null,
      previewImageUrl: previewImageUrl ?? null,
    },
    authors: me.isLoggedIn
      ? [
          {
            modelId: "",
            userId: me.user.id,
            role: "owner",
            createdAt: now,
            userName: me.user.name ?? null,
            userImage: me.user.image ?? null,
          },
        ]
      : [],
    tagsOnLatestVersion: [],
    previewImageUrl: previewImageUrl ?? null,
    counts: { versions: 0, children: 0 },
    stats: { likes: 0, views: 0, runs: 0, downloads: 0, shares: 0, likedByMe: false },
  };
};
