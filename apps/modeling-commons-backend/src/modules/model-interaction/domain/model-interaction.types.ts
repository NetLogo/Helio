export const ModelInteractionKind = {
  view: 'view',
  run: 'run',
  download: 'download',
  share: 'share',
} as const;
export type ModelInteractionKind =
  (typeof ModelInteractionKind)[keyof typeof ModelInteractionKind];

export type ModelInteractionEntity = {
  id: string;
  modelId: string;
  versionNumber: number | null;
  kind: ModelInteractionKind;
  userId: string | null;
  sessionId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  referer: string | null;
  geo: Record<string, unknown> | null;
  cookie: string | null;
  createdAt: Date;
};

export type InteractionCounts = Record<ModelInteractionKind, number>;
