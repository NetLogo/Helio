export type DomainEvent = {
  id: string;
  type: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  processedAt: Date | null;
};

export type EventSearchFilters = {
  type?: string;
  resourceType?: string;
};
