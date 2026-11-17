export type DomainEvent = {
  id: string;
  type: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type EventSearchFilters = {
  type?: string;
  resourceType?: string;
  ids?: Array<string>;
};

export type EventDispatchState =
  | 'created'
  | 'retry'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'dead';

export type EventDispatch = {
  subscriber: string;
  state: EventDispatchState;
  attempts: number | null;
  lastError: string | null;
};

export type EventDispatchStateFilter = 'retry' | 'dead';

export type EventListFilters = Omit<EventSearchFilters, 'ids'> & {
  dispatchState?: EventDispatchStateFilter;
};
