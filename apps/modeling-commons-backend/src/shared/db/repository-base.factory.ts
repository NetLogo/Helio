import { Prisma } from '#prisma/index';
import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import { mapPrismaError } from '#src/shared/db/prisma-error.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import { DatabaseErrorException } from '#src/shared/exceptions/index.ts';

type PrismaDelegate = {
  create: (args: { data: unknown }) => Promise<unknown>;
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
  findMany: (args: {
    orderBy?: Record<string, string>;
    skip?: number;
    take?: number;
  }) => Promise<Array<unknown>>;
  count: (args?: Record<string, unknown>) => Promise<number>;
  update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

export type RepositoryBase<Entity extends { id: string }> = {
  insert: (entity: Entity) => Promise<void>;
  findOneById: (id: string) => Promise<Entity | undefined>;
  findAll: () => Promise<Array<Entity>>;
  findAllPaginated: (params: PaginatedQueryParams) => Promise<Paginated<Entity>>;
  update: (entity: Entity) => Promise<Entity>;
  delete: (entityId: string) => Promise<boolean>;
};

function handleDatabaseError(error: unknown, operation: string): never {
  throw (
    mapPrismaError(error) ??
    new DatabaseErrorException(
      'Internal Server Error',
      error instanceof Error ? error : new Error(String(error)),
      { operation },
    )
  );
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

export type RepositoryBaseFactory = <Entity extends { id: string }, DbRecord>(opts: {
  tableName: string;
  mapper: Mapper<Entity, DbRecord>;
}) => RepositoryBase<Entity>;

export default function makeRepositoryBase({
  db,
}: {
  db: Record<string, PrismaDelegate>;
}): RepositoryBaseFactory {
  return function repositoryBase<Entity extends { id: string }, DbRecord>({
    tableName,
    mapper,
  }: {
    tableName: string;
    mapper: Mapper<Entity, DbRecord>;
  }): RepositoryBase<Entity> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const delegate = db[tableName]!;

    return {
      async insert(entity: Entity): Promise<void> {
        const data = mapper.toPersistence(entity);
        await delegate
          .create({ data })
          .catch((error: unknown) => handleDatabaseError(error, `insert ${tableName}`));
      },

      async findOneById(id: string): Promise<Entity | undefined> {
        const record = await delegate.findUnique({ where: { id } });
        return record ? mapper.toDomain(record as DbRecord) : undefined;
      },

      async findAll(): Promise<Array<Entity>> {
        const records = await delegate.findMany({});
        return records.map((r) => mapper.toDomain(r as DbRecord));
      },

      async findAllPaginated(params: PaginatedQueryParams): Promise<Paginated<Entity>> {
        const [count, records] = await Promise.all([
          delegate.count(),
          delegate.findMany({
            orderBy: params.orderBy
              ? { [params.orderBy.field]: params.orderBy.param }
              : { createdAt: 'desc' },
            skip: params.offset,
            take: params.limit,
          }),
        ]);
        return {
          count,
          limit: params.limit,
          page: params.page,
          data: records.map((r) => mapper.toDomain(r as DbRecord)),
        };
      },

      async update(entity: Entity): Promise<Entity> {
        const data = mapper.toPersistence(entity);
        const record = await delegate
          .update({ where: { id: entity.id }, data })
          .catch((error: unknown) => handleDatabaseError(error, `update ${tableName}`));
        return mapper.toDomain(record as DbRecord);
      },

      async delete(entityId: string): Promise<boolean> {
        return delegate.delete({ where: { id: entityId } }).then(
          () => true,
          (error: unknown) => {
            if (isRecordNotFound(error)) return false;
            return handleDatabaseError(error, `delete ${tableName}`);
          },
        );
      },
    };
  };
}
