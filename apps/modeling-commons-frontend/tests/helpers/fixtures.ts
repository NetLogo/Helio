import type { ResponseSuccessData } from "~/utils/openapi";

export type ModelCard = ResponseSuccessData<"GET", "/api/v1/models/{id}/card">;

export type ModelListItem = ResponseSuccessData<"GET", "/api/v1/models">[number] extends infer T
  ? T
  : never;

export function makeUser(overrides: Partial<{
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
}> = {}) {
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

export function makeModelListItem(overrides: Partial<{
  id: string;
  title: string;
  description: string | null;
  visibility: "public" | "private" | "unlisted";
  isEndorsed: boolean;
  parentModelId: string | null;
  previewImageUri: string | null;
  createdAt: string;
}> = {}) {
  return {
    id: "model-1",
    title: "Wolf Sheep Predation",
    description: "Classic predator-prey simulation.",
    visibility: "public" as const,
    isEndorsed: false,
    parentModelId: null,
    previewImageUri: "api/v1/models/model-1/versions/1/preview-image",
    createdAt: new Date("2026-04-01T00:00:00Z").toISOString(),
    ...overrides,
  };
}

export function makeModelCard(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "model-1",
    title: "Wolf Sheep Predation",
    description: "Classic predator-prey simulation.",
    visibility: "public",
    author: makeUser(),
    createdAt: new Date("2026-04-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-04-15T00:00:00Z").toISOString(),
    tags: ["biology", "ecology"],
    stats: { likes: 12, views: 340, runs: 25, downloads: 8, shares: 2 },
    isLiked: false,
    latestVersion: { versionNumber: 1, createdAt: new Date("2026-04-01T00:00:00Z").toISOString() },
    ...overrides,
  };
}

export function makeDraft(overrides: Partial<{
  id: string;
  userId: string;
  modelId: string | null;
  schemaVersion: number;
  data: Record<string, unknown>;
}> = {}) {
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
