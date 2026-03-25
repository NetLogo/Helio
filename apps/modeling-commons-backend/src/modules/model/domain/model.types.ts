export const ModelVisibility = {
  public: 'public',
  private: 'private',
  unlisted: 'unlisted',
} as const;
export type ModelVisibility = (typeof ModelVisibility)[keyof typeof ModelVisibility];

export type ModelEntity = {
  id: string;
  latestVersionId: string | null;
  parentModelId: string | null;
  parentVersionId: string | null;
  visibility: ModelVisibility;
  isEndorsed: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateModelProps = {
  title: string;
  description?: string;
  visibility?: ModelVisibility;
  parentModelId?: string;
  parentVersionId?: string;
};

export type UpdateModelProps = {
  visibility?: ModelVisibility;
  isEndorsed?: boolean;
};

export type ModelSearchFilters = {
  visibility?: ModelVisibility;
  tag?: string;
  authorId?: string;
  parentModelId?: string;
  isEndorsed?: boolean;
  keyword?: string;
};
