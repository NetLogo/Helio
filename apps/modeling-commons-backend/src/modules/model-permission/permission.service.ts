import type {
  ModelPermissionEntity,
  PermissionLevel,
  ModelForPermissionCheck,
} from '#src/modules/model-permission/domain/permission.types.ts';
import { meetsLevel } from '#src/modules/model-permission/domain/permission.types.ts';
import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
} from '#src/modules/model-permission/domain/permission.errors.ts';
import { rethrowUniqueViolation } from '#src/shared/db/prisma-error.ts';
import { modelPermissionEventTypes } from '#src/modules/model-permission/model-permission.events.ts';

export default function makePermissionService({
  transactionManager,
  permissionRepository,
  permissionDomain,
  eventRepository,
}: Dependencies) {
  return {
    async grant(
      modelId: string,
      granteeUserId: string,
      level: PermissionLevel,
      callerId: string,
    ): Promise<ModelPermissionEntity> {
      const entity = permissionDomain.createPermission(modelId, granteeUserId, level);

      await rethrowUniqueViolation(
        transactionManager.run(async (ctx) => {
          await permissionRepository.insertTx(ctx, entity);
          await eventRepository.insertTx(ctx, {
            type: modelPermissionEventTypes.granted,
            actorId: callerId,
            resourceType: 'model',
            resourceId: modelId,
            payload: { granteeUserId, permissionLevel: level },
          });
        }),
        () => new PermissionAlreadyExistsError(modelId, granteeUserId),
      );

      return entity;
    },

    async revoke(modelId: string, granteeUserId: string, callerId: string): Promise<void> {
      const existing = await permissionRepository.findByModelAndUser(modelId, granteeUserId);
      if (!existing) {
        throw new PermissionNotFoundError(modelId, granteeUserId);
      }

      await transactionManager.run(async (ctx) => {
        await permissionRepository.deleteTx(ctx, modelId, granteeUserId);
        await eventRepository.insertTx(ctx, {
          type: modelPermissionEventTypes.revoked,
          actorId: callerId,
          resourceType: 'model',
          resourceId: modelId,
          payload: { granteeUserId },
        });
      });
    },

    async listByModel(modelId: string): Promise<Array<ModelPermissionEntity>> {
      return permissionRepository.findAllByModel(modelId);
    },

    async check(
      userId: string | null,
      model: ModelForPermissionCheck,
      requiredLevel: PermissionLevel,
    ): Promise<boolean> {
      // 1. Model deleted -> owner only
      if (model.deletedAt) {
        if (!userId) return false;
        const author = await permissionRepository.findAuthor(model.id, userId);
        return author?.role === 'owner';
      }

      if (userId) {
        // 2. Author-based access
        const author = await permissionRepository.findAuthor(model.id, userId);
        if (author) {
          if (author.role === 'owner') return true;
          if (author.role === 'contributor') {
            return requiredLevel === 'read' || requiredLevel === 'write';
          }
        }

        // 3. Explicit ModelPermission grant
        const grant = await permissionRepository.findByModelAndUser(model.id, userId);
        if (grant && meetsLevel(grant.permissionLevel, requiredLevel)) {
          return true;
        }
      }

      // 4. Public/unlisted -> read only
      if (
        (model.visibility === 'public' || model.visibility === 'unlisted') &&
        requiredLevel === 'read'
      ) {
        return true;
      }

      // 5. Private -> deny
      return false;
    },
  };
}
