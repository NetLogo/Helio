import { getRequestId } from '#src/shared/app/app-request-context.ts';
import type {
  Paginated,
  PaginatedQueryParams,
  RepositoryPort,
} from '#src/shared/db/repository.port.ts';
import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import { ConflictException, DatabaseErrorException } from '#src/shared/exceptions/index.ts';
import type { FastifyBaseLogger } from 'fastify';

export interface PrismaRepositoryBaseProps<Entity, DbModel> {
  mapper: Mapper<Entity, DbModel>;
  logger: FastifyBaseLogger;
}

/**
 * Generic Prisma repository base.
 * Subclasses should implement CRUD operations using their specific Prisma delegate.
 *
 * Example:
 * class UserRepository extends PrismaRepositoryBase<User, PrismaUser> {
 *   constructor(props, private prisma: PrismaClient) {
 *     super(props);
 *   }
 *   async findOneById(id: string) {
 *     const user = await this.prisma.user.findUnique({ where: { id } });
 *     return user ? this.mapper.toDomain(user) : undefined;
 *   }
 * }
 */
export abstract class PrismaRepositoryBase<
  Entity extends { id: string },
  DbModel extends Record<string, unknown>,
> implements RepositoryPort<Entity>
{
  protected mapper: Mapper<Entity, DbModel>;
  protected logger: FastifyBaseLogger;

  constructor({ mapper, logger }: PrismaRepositoryBaseProps<Entity, DbModel>) {
    this.mapper = mapper;
    this.logger = logger;
  }
  abstract insert: (entity: Entity | Array<Entity>) => Promise<void>;
  abstract findOneById(id: string): Promise<Entity | undefined>;
  abstract findAll(): Promise<Array<Entity>>;
  abstract findAllPaginated(params: PaginatedQueryParams): Promise<Paginated<Entity>>;
  abstract update(entity: Entity): Promise<Entity>;
  abstract delete(entityId: string): Promise<boolean>;

  protected handleDatabaseError(error: unknown, operation: string): never {
    // @ts-expect-error - error-type
    this.logger.error(`Database error during ${operation}:`, error);

    if (error instanceof Error) {
      // Prisma unique constraint violation
      if ('code' in error && error.code === 'P2002') {
        throw new ConflictException('Record already exists', error);
      }
    }

    throw new DatabaseErrorException(
      'Database operation failed',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  protected logOperation(operation: string, details?: Record<string, unknown>): void {
    // @ts-expect-error - details type
    this.logger.debug(`[${getRequestId()}] ${operation}`, details);
  }
}
