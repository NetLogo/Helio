type QueryRecord = Record<string, string | Array<string> | null | undefined>;

function readFirstQueryParam<T extends string = string>(
  query: QueryRecord,
  key: string,
): T | undefined {
  const value = query[key];
  if (typeof value === "string") return value as T;
  if (Array.isArray(value) && value.length > 0) return value[0] as T;
  return undefined;
}

function _convertToBoolean(
  value: string | null | undefined,
  defaultValue: boolean | undefined = undefined,
): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
}

function readBooleanQueryParam(
  query: QueryRecord,
  key: string,
  defaultValue: boolean | undefined = undefined,
): boolean | undefined {
  const value = readFirstQueryParam(query, key);
  return _convertToBoolean(value, defaultValue);
}

type StringQueryKey = {
  key: string;
  type: "string";
  defaultValue?: string | undefined;
};

type NumberQueryKey = {
  key: string;
  type: "number";
  defaultValue?: number | undefined;
};
type BooleanQueryKey = {
  key: string;
  type: "boolean";
  defaultValue?: boolean | undefined;
};

type UnitQueryKey = StringQueryKey | BooleanQueryKey | NumberQueryKey;

function _convertToNumber(
  value: string | null | undefined,
  defaultValue: number | undefined = undefined,
): number | undefined {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function resolveUnit(
  value: string | null | undefined,
  type: UnitQueryKey,
): ResolveValue<UnitQueryKey> {
  switch (type.type) {
    case "string":
      return value ?? type.defaultValue ?? undefined;
    case "boolean":
      return _convertToBoolean(value, type.defaultValue ?? undefined);
    case "number":
      return _convertToNumber(value, type.defaultValue ?? undefined);
  }
}

function readNumberQueryParam(
  query: QueryRecord,
  key: string,
  defaultValue: number | undefined = undefined,
): number | undefined {
  const value = readFirstQueryParam(query, key);
  return _convertToNumber(value, defaultValue);
}

function readArrayQueryParam<Q extends UnitQueryKey>(
  query: QueryRecord,
  _key: string,
  contentType: Q,
): Array<NonNullable<ResolveValue<Q>>> {
  const value = query[contentType.key];

  let result: Array<NonNullable<ResolveValue<Q>>> = [];
  if (typeof value === "string") {
    result = [resolveUnit(value, contentType) as NonNullable<ResolveValue<Q>>];
  } else if (Array.isArray(value)) {
    result = value.map((v) => resolveUnit(v, contentType) as NonNullable<ResolveValue<Q>>);
  }
  return result.filter((v) => v !== undefined && v !== null) as Array<NonNullable<ResolveValue<Q>>>;
}

type ArrayQueryKey<Q extends UnitQueryKey = UnitQueryKey> = {
  key: string; // final result key (e.g. tags)
  type: "array";
  defaultValue?: Array<NonNullable<ResolveValue<Q>>> | undefined;
  contentType: Q; // defines how to parse individual items and where to read them from the query (e.g. key=tag, type=string)
};

type QueryKey = StringQueryKey | BooleanQueryKey | NumberQueryKey | ArrayQueryKey;

type ResolveValue<E extends QueryKey> = E extends { type: "string" }
  ? E extends { defaultValue: string }
    ? string
    : string | undefined
  : E extends { type: "boolean" }
    ? E extends { defaultValue: boolean }
      ? boolean
      : boolean | undefined
    : E extends { type: "number" }
      ? E extends { defaultValue: number }
        ? number
        : number | undefined
      : E extends { type: "array" }
        ? Array<NonNullable<ResolveValue<E["contentType"]>>>
        : never;

type QueryValues<T extends ReadonlyArray<QueryKey>> = {
  [K in T[number]["key"]]: ResolveValue<Extract<T[number], { key: K }>>;
};

function readQueryParam<T extends QueryKey>(query: QueryRecord, key: T): ResolveValue<T> {
  switch (key.type) {
    case "string":
    case "boolean":
    case "number":
      return resolveUnit(readFirstQueryParam(query, key.key), key) as ResolveValue<T>;
    case "array":
      return readArrayQueryParam(query, key.key, key.contentType) as ResolveValue<T>;
  }
}

function readQueryParams<const T extends ReadonlyArray<QueryKey>>(
  query: QueryRecord,
  keys: T,
): QueryValues<T> {
  const result: Record<string, string | number | boolean | undefined | Array<any>> = {};
  for (const entry of keys) {
    result[entry.key] = readQueryParam(query, entry);
  }
  return result as QueryValues<T>;
}

export {
  readArrayQueryParam,
  readBooleanQueryParam,
  readFirstQueryParam,
  readNumberQueryParam,
  readQueryParam,
  readQueryParams,
};

export type QueryValueFromKey<K extends QueryKey> = ResolveValue<K>;
export type {
  ArrayQueryKey,
  BooleanQueryKey,
  NumberQueryKey,
  QueryKey,
  QueryRecord,
  QueryValues,
  StringQueryKey,
  UnitQueryKey,
};
