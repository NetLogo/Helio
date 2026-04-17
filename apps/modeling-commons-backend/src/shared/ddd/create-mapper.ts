import type { Mapper } from './mapper.interface.ts';

class NotImplementedException extends Error {}

const identity = <T, U>(x: T): U => x as unknown as U;

function createMapperHelper<Entity, Record, Response>(
  input: Partial<Mapper<Entity, Record, Response>>,
): Mapper<Entity, Record, Response> {
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
export function createReadOnlyMapper<Record, Response>(input: {
  toResponse: (record: Record) => Response;
}): Mapper<Record, Record, Response> {
  return createMapperHelper<Record, Record, Response>({
    toDomain: identity as (record: Record) => Record,
    toResponse: input.toResponse,
  });
}

export function createWriteOnlyMapper<Entity extends Record, Record, Response>(input: {
  toDomain: (record: Record) => Entity;
  toResponse: (entity: Entity) => Response;
}): Mapper<Entity, Record, Response> {
  return createMapperHelper<Entity, Record, Response>({
    toDomain: input.toDomain,
    toPersistence: identity as (entity: Entity) => Record,
    toResponse: input.toResponse,
  });
}

export function createMapper<Entity, Record, Response>(
  input: Mapper<Entity, Record, Response>,
): Mapper<Entity, Record, Response> {
  return createMapperHelper(input);
}

export { identity };
function applyGlobalResponseFormat<T>(dto: T): T {
  // Date → ISO, Buffer → base64 data-url, null passthrough, etc.
  // Keep the list small and documented.
  // -- Omar Ibrahim, Apr 16 26
  if (dto === null || typeof dto !== 'object') return dto;
  const out: { [key: string]: unknown } = { ...(dto as object) };
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (value instanceof Date) out[key] = value.toISOString();
  }
  return out as T;
}
