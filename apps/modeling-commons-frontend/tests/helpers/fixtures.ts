import type { ResponseSuccessData } from "~/utils/openapi";

export type ModelCard = ResponseSuccessData<"GET", "/api/v1/models/{id}/card">;

export function makeUser(
  overrides: Partial<{
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
  }> = {},
) {
  return {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    ...overrides,
  };
}

export function makeSession(userId = "user-1") {
  return {
    id: "session-1",
    userId,
    token: "tok",
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ipAddress: null,
    userAgent: null,
  };
}

export function makeAuthState(loggedIn = true) {
  if (!loggedIn) {
    return { data: null };
  }
  const user = makeUser();
  return {
    data: { user, session: makeSession(user.id) },
  };
}

export function makeModelCard(
  overrides: {
    id?: string;
    title?: string;
    description?: string | null;
    visibility?: "public" | "private" | "unlisted";
    isEndorsed?: boolean;
    parentModelId?: string | null;
    previewImageUrl?: string | null;
    createdAt?: string;
  } = {},
): ModelCard {
  const id = overrides.id ?? "model-1";
  const createdAt = overrides.createdAt ?? new Date("2026-04-01T00:00:00Z").toISOString();
  const updatedAt = new Date("2026-04-15T00:00:00Z").toISOString();
  return {
    model: {
      id,
      createdAt,
      updatedAt,
      latestVersionNumber: 1,
      parentModelId: overrides.parentModelId ?? null,
      parentVersionNumber: null,
      visibility: overrides.visibility ?? "public",
      isEndorsed: overrides.isEndorsed ?? false,
      isLibraryModel: false,
    },
    latestVersion: {
      modelId: id,
      versionNumber: 1,
      title: overrides.title ?? "Wolf Sheep Predation",
      description: overrides.description ?? "Classic predator-prey simulation.",
      netlogoFileKey: null,
      netlogoVersion: null,
      infoTab: null,
      createdAt,
      isFinalized: true,
      netlogoFileDownloadUrl: null,
      previewImageUrl: overrides.previewImageUrl ?? null,
    },
    authors: [],
    tagsOnLatestVersion: [],
    previewImageUrl: overrides.previewImageUrl ?? null,
    counts: { versions: 1, children: 0 },
    stats: { likes: 0, views: 0, runs: 0, downloads: 0, shares: 0, likedByMe: false },
  };
}

export function makeDraft(
  overrides: Partial<{
    id: string;
    userId: string;
    modelId: string | null;
    schemaVersion: number;
    data: Record<string, unknown>;
  }> = {},
) {
  return {
    id: "draft-1",
    userId: "user-1",
    modelId: null,
    schemaVersion: 1,
    data: {
      title: "",
      description: "",
      visibility: "public" as const,
      tags: [],
      attachments: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
