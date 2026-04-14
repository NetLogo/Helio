export const ModelVisibility = {
  public: 'public',
  private: 'private',
  unlisted: 'unlisted',
} as const;
export type ModelVisibility = (typeof ModelVisibility)[keyof typeof ModelVisibility];

export type ModelEntity = {
  id: string;
  latestVersionNumber: number | null;
  parentModelId: string | null;
  parentVersionNumber: number | null;
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
  parentVersionNumber?: number;
};

export type UpdateModelProps = {
  visibility?: ModelVisibility;
  isEndorsed?: boolean;
};

export type ModelSearchFilters = {
  tag?: string;
  authorId?: string;
  parentModelId?: string;
  isEndorsed?: boolean;
  keyword?: string;
};
