import type { Mapper } from './mapper.interface.ts';

class NotImplementedException extends Error {}

const identity = <T, U>(x: T): U => x as unknown as U;

export type ResponseFormat<T> = T extends Date
  ? string
  : T extends object
    ? { [K in keyof T]: T[K] extends Date ? string : T[K] }
    : T;

export function applyGlobalResponseFormat<T>(dto: T): ResponseFormat<T> {
  // Date → ISO, etc..
  // Keep the list small and documented.
  // -- Omar Ibrahim, Apr 16 26
  if (dto === null || typeof dto !== 'object') return dto as ResponseFormat<T>;
  if (dto instanceof Date) return dto.toISOString() as ResponseFormat<T>;
  const out: { [key: string]: unknown } = { ...(dto as object) };
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (value instanceof Date) out[key] = value.toISOString();
  }
  return out as ResponseFormat<T>;
}

function createMapperHelper<Entity, Record, RawResponse>(
  input: Partial<{
    toPersistence: (entity: Entity) => Record;
    toDomain: (record: Record) => Entity;
    toResponse: (entity: Entity) => RawResponse;
  }>,
): Mapper<Entity, Record, ResponseFormat<RawResponse>> {
  return {
    toDomain:
      input.toDomain ??
      (() => {
        throw new NotImplementedException('toDomain not implemented on this mapper');
      }),
    toPersistence:
      input.toPersistence ??
      (() => {
        throw new NotImplementedException('toPersistence not implemented on this mapper');
      }),
    toResponse: input.toResponse
      ? (e) => applyGlobalResponseFormat(input.toResponse!(e))
      : () => {
          throw new NotImplementedException('toResponse not implemented on this mapper');
        },
  };
}

// Read requests can be satisfied with the identity function
// if a custom domain shape is not required.
// -- Omar Ibrahim, Apr 16 26
export function createReadOnlyMapper<Record, RawResponse>(input: {
  toResponse: (record: Record) => RawResponse;
}): Mapper<Record, Record, ResponseFormat<RawResponse>> {
  return createMapperHelper<Record, Record, RawResponse>({
    toDomain: identity as (record: Record) => Record,
    toPersistence: identity as (entity: Record) => Record,
    toResponse: input.toResponse,
  });
}

export function createWriteOnlyMapper<Entity extends Record, Record, RawResponse>(input: {
  toDomain: (record: Record) => Entity;
  toResponse: (entity: Entity) => RawResponse;
}): Mapper<Entity, Record, ResponseFormat<RawResponse>> {
  return createMapperHelper<Entity, Record, RawResponse>({
    toDomain: input.toDomain,
    toPersistence: identity as (entity: Entity) => Record,
    toResponse: input.toResponse,
  });
}

export function createMapper<Entity, Record, RawResponse>(input: {
  toPersistence: (entity: Entity) => Record;
  toDomain: (record: Record) => Entity;
  toResponse: (entity: Entity) => RawResponse;
}): Mapper<Entity, Record, ResponseFormat<RawResponse>> {
  return createMapperHelper<Entity, Record, RawResponse>(input);
}

export { identity };
