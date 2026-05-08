function readFirstQueryParam<T extends string = string>(
  query: Record<string, string | Array<string> | undefined>,
  key: string,
): T | null {
  const value = query[key];
  if (typeof value === "string") return value as T;
  if (Array.isArray(value) && value.length > 0) return value[0] as T;
  return null;
}

function readBooleanQueryParam(
  query: Record<string, string | Array<string> | undefined>,
  key: string,
  defaultValue: boolean | null = null,
): boolean | null {
  const value = readFirstQueryParam(query, key);
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
}

function readArrayQueryParam<T extends string = string>(
  query: Record<string, string | Array<string> | undefined>,
  key: string,
): Array<T> {
  const value = query[key];
  if (typeof value === "string") return [value as T];
  if (Array.isArray(value)) return value as Array<T>;
  return [];
}

type StringQueryKey = {
  key: string;
  type: "string";
  defaultValue?: string | null;
};

type BooleanQueryKey = {
  key: string;
  type: "boolean";
  defaultValue?: boolean | null;
};

type ArrayQueryKey<Q extends StringQueryKey | BooleanQueryKey = StringQueryKey | BooleanQueryKey> =
  {
    key: string;
    type: "array";
    contentType: Q;
  };

type QueryKey = StringQueryKey | BooleanQueryKey | ArrayQueryKey;

type ResolveValue<E extends QueryKey> = E extends { type: "string" }
  ? E extends { defaultValue: string }
    ? string
    : string | null
  : E extends { type: "boolean" }
    ? E extends { defaultValue: boolean }
      ? boolean
      : boolean | null
    : E extends { type: "array" }
      ? Array<ResolveValue<E["contentType"]>>
      : never;

type QueryValues<T extends ReadonlyArray<QueryKey>> = {
  [K in T[number]["key"]]: ResolveValue<Extract<T[number], { key: K }>>;
};

function readQueryParams<const T extends ReadonlyArray<QueryKey>>(
  query: Record<string, string | string[] | undefined>,
  keys: T,
): QueryValues<T> {
  const result: Record<string, string | boolean | null | Array<any>> = {};
  for (const entry of keys) {
    switch (entry.type) {
      case "string":
        result[entry.key] = readFirstQueryParam(query, entry.key) ?? entry.defaultValue ?? null;
        break;
      case "boolean":
        result[entry.key] = readBooleanQueryParam(query, entry.key, entry.defaultValue ?? null);
        break;
      case "array":
        result[entry.key] = readArrayQueryParam(query, entry.key);
        break;
    }
  }
  return result as QueryValues<T>;
}

export { readBooleanQueryParam, readFirstQueryParam, readQueryParams };
