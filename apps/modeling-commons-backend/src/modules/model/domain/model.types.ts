import type { ModelVisibility } from '#src/modules/model/shared/enums.ts';

export type ModelSortBy = 'recent' | 'views' | 'downloads' | 'runs' | 'likes';

export type CreateModelProps = {
  title: string;
  description?: string;
  visibility?: ModelVisibility;
  parentModelId?: string;
  parentVersionNumber?: number;
};

export type UpdateModelProps = {
  visibility?: ModelVisibility;
};

export type ModelSearchFilters = {
  fromDate?: string;
  toDate?: string;
  sortBy?: ModelSortBy;
  order?: 'asc' | 'desc';
  tags?: Array<string>;
  authorId?: string;
  authorRoles?: Array<'owner' | 'contributor'>;
  parentModelId?: string;
  isEndorsed?: boolean;
  isLibraryModel?: boolean;
  keyword?: string;
  netlogoVersion?: string;
  publicOnly?: boolean;
};
