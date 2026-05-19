export interface Paginated<T> {
  count: number;
  limit: number;
  page: number;
  data: Array<T>;
}

export interface OrderBy {
  field: string;
  param: 'asc' | 'desc';
}

export interface PaginatedQueryParams {
  limit: number;
  page: number;
  offset: number;
  orderBy: OrderBy;
}

export interface RepositoryPort<Entity> {
  insert: (entity: Entity) => Promise<void>;
  findOneById: (id: string) => Promise<Entity | undefined>;
  findAll: () => Promise<Array<Entity>>;
  findAllPaginated: (params: PaginatedQueryParams) => Promise<Paginated<Entity>>;
  update: (entity: Entity) => Promise<Entity>;
  delete: (entityId: string) => Promise<boolean>;
}

export function paginate<T>(data: Array<T>, params: PaginatedQueryParams, count: number): Paginated<T> {
  return { count, limit: params.limit, page: params.page, data };
}
