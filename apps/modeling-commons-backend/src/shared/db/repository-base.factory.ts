import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import { ConflictException, DatabaseErrorException } from '#src/shared/exceptions/index.ts';

type PrismaDelegate = {
  create: (args: { data: unknown }) => Promise<unknown>;
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
  findMany: (args: {
    orderBy?: Record<string, string>;
    skip?: number;
    take?: number;
  }) => Promise<unknown[]>;
  count: (args?: Record<string, unknown>) => Promise<number>;
  update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

export type RepositoryBase<Entity extends { id: string }> = {
  insert(entity: Entity): Promise<void>;
  findOneById(id: string): Promise<Entity | undefined>;
  findAll(): Promise<Entity[]>;
  findAllPaginated(params: PaginatedQueryParams): Promise<Paginated<Entity>>;
  update(entity: Entity): Promise<Entity>;
  delete(entityId: string): Promise<boolean>;
};

function handleDatabaseError(error: unknown, operation: string): never {
  if (error instanceof Error && 'code' in error && error.code === 'P2002') {
    throw new ConflictException('Record already exists', error);
  }
  throw new DatabaseErrorException(
    `Database operation failed: ${operation}`,
    error instanceof Error ? error : new Error(String(error)),
  );
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
    const delegate = db[tableName] as PrismaDelegate;

    return {
      async insert(entity: Entity): Promise<void> {
        try {
          const data = mapper.toPersistence(entity);
          await delegate.create({ data });
        } catch (error) {
          handleDatabaseError(error, `insert ${tableName}`);
        }
      },

      async findOneById(id: string): Promise<Entity | undefined> {
        const record = await delegate.findUnique({ where: { id } });
        return record ? mapper.toDomain(record as DbRecord) : undefined;
      },

      async findAll(): Promise<Entity[]> {
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
        try {
          const data = mapper.toPersistence(entity);
          const record = await delegate.update({ where: { id: entity.id }, data });
          return mapper.toDomain(record as DbRecord);
        } catch (error) {
          handleDatabaseError(error, `update ${tableName}`);
        }
      },

      async delete(entityId: string): Promise<boolean> {
        try {
          await delegate.delete({ where: { id: entityId } });
          return true;
        } catch {
          return false;
        }
      },
    };
  };
}
