import { UserNotFoundError } from '#src/modules/user/domain/user.errors.ts';
import type {
  UpdateUserProfileProps,
  UserEntity,
  UserPublicView,
  UserSearchFilters,
} from '#src/modules/user/domain/user.types.ts';
import { SystemRole } from '#src/modules/user/domain/user.types.ts';
import { ForbiddenException } from '#src/shared/exceptions/index.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';

export type FindByIdResult =
  | { canViewFullProfile: true; user: UserEntity }
  | { canViewFullProfile: false; user: UserPublicView };

export default function makeUserService({
  transactionManager,
  userRepository,
  userDomain,
  eventRepository,
}: Dependencies) {
  return {
    async updateProfile(
      userId: string,
      requesterId: string,
      requesterRole: string,
      input: UpdateUserProfileProps,
    ): Promise<void> {
      const user = await userRepository.findOneById(userId);
      if (!user) throw new UserNotFoundError(userId);
      userDomain.assertNotDeleted(user);

      if (!userDomain.isSelfOrAdmin(userId, requesterId, requesterRole)) {
        throw new ForbiddenException('Cannot update another user profile');
      }

      if (input.systemRole && !userDomain.isAdmin(requesterRole)) {
        throw new ForbiddenException('Only admins can change system roles');
      }

      const updateData: UpdateUserProfileProps = {};
      if (input.userKind !== undefined) updateData.userKind = input.userKind;
      if (input.isProfilePublic !== undefined) updateData.isProfilePublic = input.isProfilePublic;
      if (input.systemRole !== undefined) updateData.systemRole = input.systemRole;

      await transactionManager.run(async (ctx) => {
        await userRepository.updateFields(ctx, userId, updateData);
        await eventRepository.insert(ctx, {
          type: 'user.updated',
          actorId: requesterId,
          resourceType: 'user',
          resourceId: userId,
          payload: updateData,
        });
      });
    },

    async softDelete(userId: string, requesterId: string, requesterRole: string): Promise<void> {
      const user = await userRepository.findOneById(userId);
      if (!user) throw new UserNotFoundError(userId);
      userDomain.assertNotDeleted(user);

      if (!userDomain.isSelfOrAdmin(userId, requesterId, requesterRole)) {
        throw new ForbiddenException('Cannot delete another user');
      }

      await transactionManager.run(async (ctx) => {
        await userRepository.softDelete(ctx, userId);
        await eventRepository.insert(ctx, {
          type: 'user.deleted',
          actorId: requesterId,
          resourceType: 'user',
          resourceId: userId,
          payload: {},
        });
      });
    },

    async findById(
      userId: string,
      requesterId: string | null,
      requesterRole: string | null,
    ): Promise<FindByIdResult> {
      const user = await userRepository.findOneById(userId);
      if (!user) throw new UserNotFoundError(userId);
      if (user.deletedAt) throw new UserNotFoundError(userId);

      if (userDomain.canViewProfile(user, requesterId, requesterRole)) {
        return { canViewFullProfile: true, user };
      }

      return { canViewFullProfile: false, user: userDomain.extractPublicView(user) };
    },

    async findAll(
      filters: UserSearchFilters,
      query: { limit?: number; page?: number },
      requesterRole: string | null,
    ): Promise<Paginated<UserEntity>> {
      const params = paginatedQueryBase(query);
      const publicOnly = requesterRole !== SystemRole.admin;
      return userRepository.search(filters, params, publicOnly);
    },
  };
}
